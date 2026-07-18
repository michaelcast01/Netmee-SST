"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";

const id = z.string().min(1).max(64);
const incidentSchema = z.object({ title: z.string().trim().min(5).max(160), description: z.string().trim().min(10).max(2000), severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), inspectionId: z.string().optional() });
const actionSchema = z.object({ incidentId: id, responsibleId: id, description: z.string().trim().min(10).max(1500), dueAt: z.string().min(1) });
const closeSchema = z.object({ actionId: id, closureNotes: z.string().trim().min(10).max(1500) });

export async function createIncidentAction(formData: FormData) {
  const actor = await requirePermission("incident.create");
  const input = incidentSchema.parse({ title: formData.get("title"), description: formData.get("description"), severity: formData.get("severity"), inspectionId: String(formData.get("inspectionId") ?? "") || undefined });
  const incident = await getPrisma().incident.create({ data: { code: `NOV-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`, title: input.title, description: input.description, severity: input.severity, inspectionId: input.inspectionId || null, reportedById: actor.id } });
  await getPrisma().auditLog.create({ data: { actorId: actor.id, action: "incident.created", entityType: "incident", entityId: incident.id } });
  revalidatePath("/novedades");
}

export async function createCorrectiveAction(formData: FormData) {
  const actor = await requirePermission("corrective_action.manage");
  const input = actionSchema.parse({ incidentId: formData.get("incidentId"), responsibleId: formData.get("responsibleId"), description: formData.get("description"), dueAt: formData.get("dueAt") });
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const action = await tx.correctiveAction.create({ data: { incidentId: input.incidentId, responsibleId: input.responsibleId, description: input.description, dueAt: new Date(input.dueAt) } });
    await tx.incident.update({ where: { id: input.incidentId }, data: { status: "IN_PROGRESS", responsibleId: input.responsibleId } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "corrective_action.created", entityType: "corrective_action", entityId: action.id, metadata: { incidentId: input.incidentId } } });
  });
  revalidatePath("/novedades");
}

export async function closeCorrectiveAction(formData: FormData) {
  const actor = await requirePermission("corrective_action.manage");
  const input = closeSchema.parse({ actionId: formData.get("actionId"), closureNotes: formData.get("closureNotes") });
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const action = await tx.correctiveAction.findUniqueOrThrow({ where: { id: input.actionId } });
    const changed = await tx.correctiveAction.updateMany({ where: { id: input.actionId, status: { notIn: ["COMPLETED", "CANCELLED"] } }, data: { status: "COMPLETED", completedAt: new Date(), verifiedAt: new Date(), verifiedById: actor.id, closureNotes: input.closureNotes } });
    if (changed.count !== 1) throw new Error("La acción ya se encontraba cerrada.");
    const openActions = await tx.correctiveAction.count({ where: { incidentId: action.incidentId, status: { notIn: ["COMPLETED", "CANCELLED"] } } });
    if (openActions === 0) await tx.incident.update({ where: { id: action.incidentId }, data: { status: "RESOLVED" } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "corrective_action.completed", entityType: "corrective_action", entityId: action.id } });
  });
  revalidatePath("/novedades");
}
