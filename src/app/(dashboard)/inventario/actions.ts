"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/dal";
import { actionErrorMessage, redirectWithFlash } from "@/lib/actions/redirect-with-flash";
import { getPrisma } from "@/lib/db/prisma";

const id = z.string().min(1).max(64);
const assignmentSchema = z.object({ ppeItemId: id, workerId: id, notes: z.string().trim().max(500).optional() });

export async function assignPpeItemAction(formData: FormData) {
  try {
    const actor = await requirePermission("inventory.update");
    const input = assignmentSchema.parse({ ppeItemId: formData.get("ppeItemId"), workerId: formData.get("workerId"), notes: formData.get("notes") || undefined });
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      const changed = await tx.ppeItem.updateMany({ where: { id: input.ppeItemId, status: "DISPONIBLE", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, data: { status: "ASIGNADO" } });
      if (changed.count !== 1) throw new Error("El elemento no está disponible o se encuentra vencido.");
      await tx.user.findFirstOrThrow({
        where: {
          id: input.workerId,
          active: true,
          roles: { some: { role: { code: "TECHNICIAN" } } },
        },
      });
      await tx.ppeAssignment.create({ data: { ppeItemId: input.ppeItemId, workerId: input.workerId, notes: input.notes || null } });
      await tx.ppeMovement.create({ data: { ppeItemId: input.ppeItemId, actorId: actor.id, type: "DELIVERY", notes: input.notes || null, metadata: { workerId: input.workerId } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "inventory.item.assigned", entityType: "ppe_item", entityId: input.ppeItemId, metadata: { workerId: input.workerId } } });
    });
    revalidatePath("/inventario");
    redirectWithFlash("/inventario", { success: encodeURIComponent("Elemento asignado correctamente.") });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirectWithFlash("/inventario", { error: encodeURIComponent(actionErrorMessage(error)) });
  }
}

export async function returnPpeItemAction(formData: FormData) {
  try {
    const actor = await requirePermission("inventory.update");
    const assignmentId = id.parse(formData.get("assignmentId"));
    const prisma = getPrisma();
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.ppeAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
      const changed = await tx.ppeAssignment.updateMany({ where: { id: assignmentId, status: "ACTIVE" }, data: { status: "RETURNED", returnedAt: new Date() } });
      if (changed.count !== 1) throw new Error("La asignación ya se encontraba cerrada.");
      const item = await tx.ppeItem.findUniqueOrThrow({
        where: { id: assignment.ppeItemId },
        select: { expiresAt: true },
      });
      const returnedStatus = item.expiresAt && item.expiresAt <= new Date() ? "VENCIDO" : "DISPONIBLE";
      await tx.ppeItem.update({ where: { id: assignment.ppeItemId }, data: { status: returnedStatus } });
      await tx.ppeMovement.create({ data: { ppeItemId: assignment.ppeItemId, actorId: actor.id, type: "RETURN", metadata: { workerId: assignment.workerId } } });
      await tx.auditLog.create({ data: { actorId: actor.id, action: "inventory.item.returned", entityType: "ppe_item", entityId: assignment.ppeItemId } });
    });
    revalidatePath("/inventario");
    redirectWithFlash("/inventario", { success: encodeURIComponent("Devolución registrada correctamente.") });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirectWithFlash("/inventario", { error: encodeURIComponent(actionErrorMessage(error)) });
  }
}
