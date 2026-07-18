import { z } from "zod";

export const createInspectionSchema = z.object({
  activityId: z.string().min(1).max(64),
  workerId: z.string().min(1).max(64),
  scheduledAt: z.coerce.date().optional(),
});

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;
