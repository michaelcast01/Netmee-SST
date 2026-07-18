"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser, requirePermission } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { requestInspectionReview, reviewInspection } from "@/modules/inspections";

const idSchema = z.string().min(1).max(64);
const createSchema = z.object({ activityId: idSchema, scheduledAt: z.string().optional() });
const itemSchema = z.object({ inspectionId: idSchema, itemId: idSchema, compliant: z.enum(["true", "false"]), observation: z.string().trim().max(500).optional() });
const reviewSchema = z.object({ inspectionId: idSchema, decision: z.enum(["APPROVED", "REJECTED"]), reason: z.string().trim().min(3).max(500) });

function inspectionCode() {
  return `INS-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createInspectionAction(formData: FormData) {
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
        status: "DRAFT",
        items: { create: activity.ppeRequirements.map((requirement) => ({ ppeTypeId: requirement.ppeTypeId, required: requirement.required })) },
        history: { create: { toStatus: "DRAFT", changedById: actor.id, reason: "Inspección creada" } },
      },
    });
  });
  redirect(`/inspecciones/${inspection.id}`);
}

export async function updateInspectionItemAction(formData: FormData) {
  const actor = await requirePermission("inspection.create");
  const input = itemSchema.parse({ inspectionId: formData.get("inspectionId"), itemId: formData.get("itemId"), compliant: formData.get("compliant"), observation: formData.get("observation") });
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const inspection = await tx.inspection.findUniqueOrThrow({ where: { id: input.inspectionId }, select: { workerId: true, status: true } });
    if (inspection.workerId !== actor.id) throw new Error("No puedes modificar una inspección de otro trabajador.");
    if (!["DRAFT", "IN_PROGRESS", "PENDING_CORRECTION"].includes(inspection.status)) throw new Error("La inspección ya no admite cambios.");
    await tx.inspectionItem.update({ where: { id: input.itemId, inspectionId: input.inspectionId }, data: { compliant: input.compliant === "true", observation: input.observation || null } });
    if (inspection.status === "DRAFT") {
      await tx.inspection.update({ where: { id: input.inspectionId }, data: { status: "IN_PROGRESS" } });
      await tx.inspectionStatusHistory.create({ data: { inspectionId: input.inspectionId, fromStatus: "DRAFT", toStatus: "IN_PROGRESS", changedById: actor.id, reason: "Verificación iniciada" } });
    }
  });
  revalidatePath(`/inspecciones/${input.inspectionId}`);
}

export async function submitInspectionForReviewAction(formData: FormData) {
  const actor = await requirePermission("inspection.create");
  const inspectionId = idSchema.parse(formData.get("inspectionId"));
  const prisma = getPrisma();
  const inspection = await prisma.inspection.findUniqueOrThrow({ where: { id: inspectionId }, include: { items: true } });
  if (inspection.workerId !== actor.id) throw new Error("No puedes enviar una inspección de otro trabajador.");
  const updated = requestInspectionReview({ id: inspection.id, status: inspection.status, items: inspection.items.map((item) => ({ id: item.id, required: item.required, compliant: item.compliant })) });
  await prisma.$transaction(async (tx) => {
    const changed = await tx.inspection.updateMany({ where: { id: inspectionId, status: inspection.status }, data: { status: updated.status } });
    if (changed.count !== 1) throw new Error("La inspección cambió mientras era procesada.");
    await tx.inspectionStatusHistory.create({ data: { inspectionId, fromStatus: inspection.status, toStatus: updated.status, changedById: actor.id, reason: "Enviada para revisión" } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "inspection.review.requested", entityType: "inspection", entityId: inspectionId } });
  });
  revalidatePath(`/inspecciones/${inspectionId}`);
  revalidatePath("/inspecciones");
}

export async function reviewInspectionAction(formData: FormData) {
  const actor = await requirePermission("inspection.review");
  const input = reviewSchema.parse({ inspectionId: formData.get("inspectionId"), decision: formData.get("decision"), reason: formData.get("reason") });
  const prisma = getPrisma();
  const inspection = await prisma.inspection.findUniqueOrThrow({ where: { id: input.inspectionId }, include: { items: true } });
  const updated = reviewInspection({ id: inspection.id, status: inspection.status, items: inspection.items.map((item) => ({ id: item.id, required: item.required, compliant: item.compliant })) }, input.decision);
  await prisma.$transaction(async (tx) => {
    const changed = await tx.inspection.updateMany({ where: { id: input.inspectionId, status: "PENDING_REVIEW" }, data: { status: updated.status, reviewedById: actor.id, reviewedAt: new Date(), completedAt: new Date() } });
    if (changed.count !== 1) throw new Error("La inspección ya fue revisada.");
    await tx.inspectionStatusHistory.create({ data: { inspectionId: input.inspectionId, fromStatus: "PENDING_REVIEW", toStatus: updated.status, changedById: actor.id, reason: input.reason } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: `inspection.${input.decision.toLowerCase()}`, entityType: "inspection", entityId: input.inspectionId, metadata: { reason: input.reason } } });
  });
  revalidatePath(`/inspecciones/${input.inspectionId}`);
  revalidatePath("/inspecciones");
}

export async function canViewInspection(workerId: string) {
  const user = await getCurrentUser();
  return Boolean(user && (user.id === workerId || hasPermission(user.permissions, "inspection.review")));
}
