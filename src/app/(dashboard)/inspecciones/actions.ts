"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser, requirePermission } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { actionErrorMessage, redirectWithFlash } from "@/lib/actions/redirect-with-flash";
import { getPrisma } from "@/lib/db/prisma";
import { requestInspectionReview, reviewInspection } from "@/modules/inspections";

const idSchema = z.string().min(1).max(64);
const createSchema = z.object({ activityId: idSchema, scheduledAt: z.string().optional() });
const itemSchema = z.object({ inspectionId: idSchema, itemId: idSchema, compliant: z.enum(["true", "false"]), observation: z.string().trim().max(500).optional() });
const reviewSchema = z.object({ inspectionId: idSchema, decision: z.enum(["APROBADA", "RECHAZADA"]), reason: z.string().trim().min(3).max(500), signerName: z.string().trim().min(3).max(120) });
const retentionSchema = z.object({ inspectionId: idSchema, evidenceId: idSchema, legalHold: z.enum(["true", "false"]) });

function inspectionCode() {
  return `INS-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createInspectionAction(formData: FormData) {
  try {
    const actor = await requirePermission("inspection.create");
    const input = createSchema.parse({ activityId: formData.get("activityId"), scheduledAt: String(formData.get("scheduledAt") ?? "") || undefined });
    const prisma = getPrisma();
    const inspection = await prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findFirstOrThrow({ where: { id: input.activityId, active: true }, include: { ppeRequirements: true } });
      if (activity.ppeRequirements.length === 0) throw new Error("La actividad no tiene una matriz de EPP configurada.");
      return tx.inspection.create({
        data: {
          code: inspectionCode(),
          workerId: actor.id,
          activityId: activity.id,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          status: "BORRADOR",
          items: { create: activity.ppeRequirements.map((requirement) => ({ ppeTypeId: requirement.ppeTypeId, required: requirement.required })) },
          history: { create: { toStatus: "BORRADOR", changedById: actor.id, reason: "Inspección creada" } },
        },
      });
    });
    redirect(`/inspecciones/${inspection.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirectWithFlash("/inspecciones/nueva", { error: encodeURIComponent(actionErrorMessage(error)) });
  }
}

export async function updateInspectionItemAction(formData: FormData) {
  const inspectionId = String(formData.get("inspectionId") ?? "");
  try {
    const actor = await requirePermission("inspection.create");
    const input = itemSchema.parse({ inspectionId: formData.get("inspectionId"), itemId: formData.get("itemId"), compliant: formData.get("compliant"), observation: formData.get("observation") });
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.findUniqueOrThrow({ where: { id: input.inspectionId }, select: { workerId: true, status: true } });
      if (inspection.workerId !== actor.id) throw new Error("No puedes modificar una inspección de otro trabajador.");
      if (!["BORRADOR", "EN_PROGRESO", "CORRECCION_PENDIENTE"].includes(inspection.status)) throw new Error("La inspección ya no admite cambios.");
      await tx.inspectionItem.update({ where: { id: input.itemId, inspectionId: input.inspectionId }, data: { compliant: input.compliant === "true", observation: input.observation || null } });
      if (inspection.status === "BORRADOR") {
        await tx.inspection.update({ where: { id: input.inspectionId }, data: { status: "EN_PROGRESO" } });
        await tx.inspectionStatusHistory.create({ data: { inspectionId: input.inspectionId, fromStatus: "BORRADOR", toStatus: "EN_PROGRESO", changedById: actor.id, reason: "Verificación iniciada" } });
      }
    });
    revalidatePath(`/inspecciones/${input.inspectionId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirectWithFlash(`/inspecciones/${inspectionId}`, { error: encodeURIComponent(actionErrorMessage(error)) });
  }
}

export async function submitInspectionForReviewAction(formData: FormData) {
  const inspectionId = String(formData.get("inspectionId") ?? "");
  try {
    const actor = await requirePermission("inspection.create");
    const parsedId = idSchema.parse(inspectionId);
    const prisma = getPrisma();
    const inspection = await prisma.inspection.findUniqueOrThrow({ where: { id: parsedId }, include: { items: true } });
    if (inspection.workerId !== actor.id) throw new Error("No puedes enviar una inspección de otro trabajador.");
    const updated = requestInspectionReview({ id: inspection.id, status: inspection.status, items: inspection.items.map((item) => ({ id: item.id, required: item.required, compliant: item.compliant })) });
    await prisma.$transaction(async (tx) => {
      const changed = await tx.inspection.updateMany({ where: { id: parsedId, status: inspection.status }, data: { status: updated.status } });
      if (changed.count !== 1) throw new Error("La inspección cambió mientras era procesada.");
      await tx.inspectionStatusHistory.create({ data: { inspectionId: parsedId, fromStatus: inspection.status, toStatus: updated.status, changedById: actor.id, reason: "Enviada para revisión" } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "inspection.review.requested", entityType: "inspection", entityId: parsedId } });
    });
    revalidatePath(`/inspecciones/${parsedId}`);
    revalidatePath("/inspecciones");
    redirectWithFlash(`/inspecciones/${parsedId}`, { success: encodeURIComponent("Inspección enviada a revisión.") });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirectWithFlash(`/inspecciones/${inspectionId}`, { error: encodeURIComponent(actionErrorMessage(error)) });
  }
}

export async function reviewInspectionAction(formData: FormData) {
  const inspectionId = String(formData.get("inspectionId") ?? "");
  try {
    const actor = await requirePermission("inspection.review");
    const input = reviewSchema.parse({ inspectionId: formData.get("inspectionId"), decision: formData.get("decision"), reason: formData.get("reason"), signerName: formData.get("signerName") });
    const prisma = getPrisma();
    const inspection = await prisma.inspection.findUniqueOrThrow({ where: { id: input.inspectionId }, include: { items: true } });
    const updated = reviewInspection({ id: inspection.id, status: inspection.status, items: inspection.items.map((item) => ({ id: item.id, required: item.required, compliant: item.compliant })) }, input.decision);
    const signedAt = new Date();
    const signatureHash = createHash("sha256").update([input.inspectionId, actor.id, input.decision, input.signerName, input.reason, signedAt.toISOString()].join("|")).digest("hex");
    const isApproved = updated.status === "APROBADA";
    await prisma.$transaction(async (tx) => {
      const changed = await tx.inspection.updateMany({
        where: { id: input.inspectionId, status: "PENDIENTE_REVISION" },
        data: {
          status: updated.status,
          reviewedById: actor.id,
          reviewedAt: signedAt,
          ...(isApproved ? { completedAt: signedAt } : {}),
        },
      });
      if (changed.count !== 1) throw new Error("La inspección ya fue revisada.");
      await tx.inspectionStatusHistory.create({ data: { inspectionId: input.inspectionId, fromStatus: "PENDIENTE_REVISION", toStatus: updated.status, changedById: actor.id, reason: input.reason } });
      await tx.inspectionApproval.create({ data: { inspectionId: input.inspectionId, reviewerId: actor.id, decision: input.decision, signerName: input.signerName, reason: input.reason, signatureHash, signedAt } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: `inspection.${input.decision.toLowerCase()}`, entityType: "inspection", entityId: input.inspectionId, metadata: { reason: input.reason, signatureHash } } });
    });
    revalidatePath(`/inspecciones/${input.inspectionId}`);
    revalidatePath("/inspecciones");
    const successMessage = isApproved ? "Inspección aprobada y firmada." : "Inspección devuelta para corrección.";
    redirectWithFlash(`/inspecciones/${input.inspectionId}`, { success: encodeURIComponent(successMessage) });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirectWithFlash(`/inspecciones/${inspectionId}`, { error: encodeURIComponent(actionErrorMessage(error)) });
  }
}

export async function canViewInspection(workerId: string) {
  const user = await getCurrentUser();
  return Boolean(user && (user.id === workerId || hasPermission(user.permissions, "inspection.review")));
}

export async function setEvidenceLegalHoldAction(formData: FormData) {
  const inspectionId = String(formData.get("inspectionId") ?? "");
  try {
    const actor = await requirePermission("inspection.review");
    const input = retentionSchema.parse({ inspectionId: formData.get("inspectionId"), evidenceId: formData.get("evidenceId"), legalHold: formData.get("legalHold") });
    const db = getPrisma();
    const changed = await db.evidence.updateMany({ where: { id: input.evidenceId, inspectionId: input.inspectionId }, data: { legalHold: input.legalHold === "true" } });
    if (changed.count !== 1) throw new Error("Evidencia no encontrada.");
    await db.auditLog.create({ data: { actorId: actor.id, action: input.legalHold === "true" ? "evidence.legal_hold.enabled" : "evidence.legal_hold.disabled", entityType: "evidence", entityId: input.evidenceId, metadata: { inspectionId: input.inspectionId } } });
    revalidatePath(`/inspecciones/${input.inspectionId}`);
    redirectWithFlash(`/inspecciones/${input.inspectionId}`, { success: encodeURIComponent(input.legalHold === "true" ? "Retención legal activada." : "Retención legal liberada.") });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirectWithFlash(`/inspecciones/${inspectionId}`, { error: encodeURIComponent(actionErrorMessage(error)) });
  }
}
