import { z } from "zod";

const statusSchema = z.enum(["BORRADOR", "EN_PROGRESO", "CORRECCION_PENDIENTE", "PENDIENTE_REVISION", "APROBADA", "RECHAZADA", "CANCELADA"]);
const dateSchema = z.iso.date();

export const CSV_DEFAULT_LIMIT = 1_000;
export const CSV_MAX_LIMIT = 10_000;

export function csvCell(value: string | number | Date | null) {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function parseInspectionCsvFilters(searchParams: URLSearchParams) {
  const requestedLimit = Number(searchParams.get("limit") ?? CSV_DEFAULT_LIMIT);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), CSV_MAX_LIMIT) : CSV_DEFAULT_LIMIT;
  const statusResult = statusSchema.safeParse(searchParams.get("status"));
  const fromResult = dateSchema.safeParse(searchParams.get("from"));
  const toResult = dateSchema.safeParse(searchParams.get("to"));
  const from = fromResult.success ? new Date(`${fromResult.data}T00:00:00.000Z`) : undefined;
  const to = toResult.success ? new Date(`${toResult.data}T23:59:59.999Z`) : undefined;
  return {
    limit,
    status: statusResult.success ? statusResult.data : undefined,
    createdAt: from || to ? { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } : undefined,
  };
}
