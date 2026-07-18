export const inspectionStatuses = [
  "DRAFT",
  "IN_PROGRESS",
  "PENDING_CORRECTION",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export type InspectionStatus = (typeof inspectionStatuses)[number];

export type InspectionItem = {
  id: string;
  required: boolean;
  compliant: boolean | null;
};

export type Inspection = {
  id: string;
  status: InspectionStatus;
  items: InspectionItem[];
};

export class InspectionRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InspectionRuleError";
  }
}

export function requestInspectionReview(inspection: Inspection): Inspection {
  if (inspection.status !== "IN_PROGRESS" && inspection.status !== "PENDING_CORRECTION") {
    throw new InspectionRuleError("Solo una inspección activa puede enviarse a revisión.");
  }

  const hasUnverifiedRequiredItem = inspection.items.some(
    (item) => item.required && item.compliant !== true,
  );

  if (hasUnverifiedRequiredItem) {
    throw new InspectionRuleError(
      "No se puede enviar la inspección: existe un EPP obligatorio sin verificar.",
    );
  }

  return { ...inspection, status: "PENDING_REVIEW" };
}

export function reviewInspection(
  inspection: Inspection,
  decision: "APPROVED" | "REJECTED",
): Inspection {
  if (inspection.status !== "PENDING_REVIEW") {
    throw new InspectionRuleError("Solo una inspección pendiente de revisión puede evaluarse.");
  }
  return { ...inspection, status: decision };
}

export function cancelInspection(inspection: Inspection): Inspection {
  if (["APPROVED", "REJECTED", "CANCELLED"].includes(inspection.status)) {
    throw new InspectionRuleError("La inspección ya se encuentra en un estado final.");
  }
  return { ...inspection, status: "CANCELLED" };
}
