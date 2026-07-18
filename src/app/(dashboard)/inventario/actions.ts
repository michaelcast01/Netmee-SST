"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";

const id = z.string().min(1).max(64);
const createItemSchema = z.object({ ppeTypeId: id, serialNumber: z.string().trim().max(100).optional(), size: z.string().trim().max(30).optional(), expiresAt: z.string().optional() });
const assignmentSchema = z.object({ ppeItemId: id, workerId: id, notes: z.string().trim().max(500).optional() });

export async function createPpeItemAction(formData: FormData) {
  const actor = await requirePermission("inventory.update");
  const input = createItemSchema.parse({ ppeTypeId: formData.get("ppeTypeId"), serialNumber: formData.get("serialNumber") || undefined, size: formData.get("size") || undefined, expiresAt: formData.get("expiresAt") || undefined });
  const prisma = getPrisma();
  const item = await prisma.$transaction(async (tx) => {
    await tx.ppeType.findUniqueOrThrow({ where: { id: input.ppeTypeId } });
    const created = await tx.ppeItem.create({ data: { ppeTypeId: input.ppeTypeId, serialNumber: input.serialNumber || null, size: input.size || null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, qrCode: `EPP-${randomUUID()}` } });
    await tx.ppeMovement.create({ data: { ppeItemId: created.id, actorId: actor.id, type: "PURCHASE", notes: "Alta inicial del elemento" } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "inventory.item.created", entityType: "ppe_item", entityId: created.id } });
    return created;
  });
  redirect(`/inventario?created=${item.id}`);
}

export async function assignPpeItemAction(formData: FormData) {
  const actor = await requirePermission("inventory.update");
  const input = assignmentSchema.parse({ ppeItemId: formData.get("ppeItemId"), workerId: formData.get("workerId"), notes: formData.get("notes") || undefined });
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const changed = await tx.ppeItem.updateMany({ where: { id: input.ppeItemId, status: "DISPONIBLE", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, data: { status: "ASIGNADO" } });
    if (changed.count !== 1) throw new Error("El elemento no está disponible o se encuentra vencido.");
    await tx.user.findFirstOrThrow({ where: { id: input.workerId, active: true } });
    await tx.ppeAssignment.create({ data: { ppeItemId: input.ppeItemId, workerId: input.workerId, notes: input.notes || null } });
    await tx.ppeMovement.create({ data: { ppeItemId: input.ppeItemId, actorId: actor.id, type: "DELIVERY", notes: input.notes || null, metadata: { workerId: input.workerId } } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "inventory.item.assigned", entityType: "ppe_item", entityId: input.ppeItemId, metadata: { workerId: input.workerId } } });
  });
  revalidatePath("/inventario");
}

export async function returnPpeItemAction(formData: FormData) {
  const actor = await requirePermission("inventory.update");
  const assignmentId = id.parse(formData.get("assignmentId"));
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const assignment = await tx.ppeAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
    const changed = await tx.ppeAssignment.updateMany({ where: { id: assignmentId, status: "ACTIVE" }, data: { status: "RETURNED", returnedAt: new Date() } });
    if (changed.count !== 1) throw new Error("La asignación ya se encontraba cerrada.");
    await tx.ppeItem.update({ where: { id: assignment.ppeItemId }, data: { status: "DISPONIBLE" } });
    await tx.ppeMovement.create({ data: { ppeItemId: assignment.ppeItemId, actorId: actor.id, type: "RETURN", metadata: { workerId: assignment.workerId } } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "inventory.item.returned", entityType: "ppe_item", entityId: assignment.ppeItemId } });
  });
  revalidatePath("/inventario");
}
