import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";

import { getPrisma } from "../src/lib/db/prisma";
import { permissions, rolePermissions, roles } from "../src/lib/auth/permissions";

const roleNames = {
  TECHNICIAN: "Técnico",
  SST_MANAGER: "Responsable SG-SST",
  OPERATIONS_COORDINATOR: "Coordinador de operaciones",
  SYSTEM_ADMIN: "Administrador del sistema",
  MANAGEMENT: "Gerencia",
} as const;

async function seed() {
  const prisma = getPrisma();

  for (const code of permissions) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, name: code },
      update: {},
    });
  }

  for (const code of roles) {
    const role = await prisma.role.upsert({
      where: { code },
      create: { code, name: roleNames[code] },
      update: { name: roleNames[code] },
    });

    for (const permissionCode of rolePermissions[code]) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { code: permissionCode },
      });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME ?? "Administrador NETMEE";
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!email || !password || !secret) {
    throw new Error(
      "SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD y BETTER_AUTH_SECRET son obligatorios.",
    );
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const auth = betterAuth({
      secret,
      baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
      database: prismaAdapter(prisma, { provider: "postgresql" }),
      emailAndPassword: { enabled: true, minPasswordLength: 12 },
    });
    const created = await auth.api.signUpEmail({ body: { email, password, name } });
    user = await prisma.user.findUniqueOrThrow({ where: { id: created.user.id } });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { code: "SYSTEM_ADMIN" },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    create: { userId: user.id, roleId: adminRole.id },
    update: {},
  });

  const heightWork = await prisma.activity.upsert({
    where: { name: "Trabajo en alturas" },
    create: { name: "Trabajo en alturas" },
    update: { active: true },
  });
  const hazards = ["Caída a diferente nivel", "Caída de objetos", "Golpes y atrapamientos"];
  for (const name of hazards) {
    const hazard = await prisma.hazard.upsert({ where: { name }, create: { name }, update: {} });
    await prisma.activityHazard.upsert({ where: { activityId_hazardId: { activityId: heightWork.id, hazardId: hazard.id } }, create: { activityId: heightWork.id, hazardId: hazard.id }, update: {} });
  }
  const requiredPpe = [
    { code: "HELMET_CHINSTRAP", name: "Casco con barbuquejo" },
    { code: "FULL_BODY_HARNESS", name: "Arnés de cuerpo completo" },
    { code: "LANYARD", name: "Eslinga de seguridad" },
    { code: "SAFETY_FOOTWEAR", name: "Calzado de seguridad" },
  ];
  for (const definition of requiredPpe) {
    const ppeType = await prisma.ppeType.upsert({ where: { code: definition.code }, create: definition, update: { name: definition.name } });
    await prisma.activityPpeRequirement.upsert({ where: { activityId_ppeTypeId: { activityId: heightWork.id, ppeTypeId: ppeType.id } }, create: { activityId: heightWork.id, ppeTypeId: ppeType.id, required: true }, update: { required: true } });
  }
}

seed()
  .then(async () => getPrisma().$disconnect())
  .catch(async (error) => {
    console.error(error);
    await getPrisma().$disconnect();
    process.exitCode = 1;
  });
