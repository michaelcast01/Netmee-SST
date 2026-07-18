import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { resolveDatabaseUrl } from "@/lib/db/connection-url";

let prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (prisma) return prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  const runtimeUrl = resolveDatabaseUrl(connectionString, "transaction");

  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: runtimeUrl, max: 5 }),
  });

  return prisma;
}
