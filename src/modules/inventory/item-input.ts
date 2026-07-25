import { z } from "zod";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );

export const createPpeItemSchema = z.object({
  ppeTypeId: z.string().min(1).max(64),
  serialNumber: optionalText(100),
  size: optionalText(30),
  expiresAt: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de vencimiento no es válida.").optional(),
  ),
});

export type CreatePpeItemInput = z.infer<typeof createPpeItemSchema>;

export function parsePpeExpiry(value: string | undefined) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}
