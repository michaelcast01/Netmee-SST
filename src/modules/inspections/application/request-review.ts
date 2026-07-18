import { InspectionRuleError, requestInspectionReview } from "../domain/inspection";
import type { InspectionRepository } from "./inspection-repository";

export class InspectionNotFoundError extends Error {}

export async function requestReview(
  inspectionId: string,
  repository: InspectionRepository,
) {
  const inspection = await repository.findById(inspectionId);
  if (!inspection) throw new InspectionNotFoundError("Inspección no encontrada.");

  const updated = requestInspectionReview(inspection);
  await repository.save(updated);
  return updated;
}

export { InspectionRuleError };
