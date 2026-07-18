import type { PpeItemStatus } from "@/generated/prisma/client";

export const ppeStatuses = [
  "DISPONIBLE",
  "ASIGNADO",
  "MANTENIMIENTO",
  "DANADO",
  "VENCIDO",
  "PERDIDO",
  "RETIRADO",
] as const satisfies readonly PpeItemStatus[];

export const ppeStatusLabels: Record<PpeItemStatus, string> = {
  DISPONIBLE: "Disponible",
  ASIGNADO: "Asignado",
  MANTENIMIENTO: "En mantenimiento",
  DANADO: "Dañado",
  VENCIDO: "Vencido",
  PERDIDO: "Perdido",
  RETIRADO: "Retirado",
};
