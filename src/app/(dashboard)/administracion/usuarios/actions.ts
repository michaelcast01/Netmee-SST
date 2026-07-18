"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/dal";
import { roles } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";

const assignRoleSchema = z.object({
  userId: z.string().min(1),
  roleCode: z.enum(roles),
});

export async function assignRoleAction(formData: FormData) {
  const actor = await requirePermission("user.manage");
  const input = assignRoleSchema.parse({ userId: formData.get("userId"), roleCode: formData.get("roleCode") });
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    const role = await tx.role.findUniqueOrThrow({ where: { code: input.roleCode } });
    await tx.userRole.upsert({ where: { userId_roleId: { userId: input.userId, roleId: role.id } }, create: { userId: input.userId, roleId: role.id }, update: {} });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "user.role.assigned", entityType: "user", entityId: input.userId, metadata: { role: input.roleCode } } });
  });
  revalidatePath("/administracion/usuarios");
}
