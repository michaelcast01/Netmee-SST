export const inspectionStatuses = [
  "BORRADOR",
  "EN_PROGRESO",
  "CORRECCION_PENDIENTE",
  "PENDIENTE_REVISION",
  "APROBADA",
  "RECHAZADA",
  "CANCELADA",
] as const;

export type InspectionStatus = (typeof inspectionStatuses)[number];

export const inspectionStatusLabels: Record<InspectionStatus, string> = {
  BORRADOR: "Borrador",
  EN_PROGRESO: "En progreso",
  CORRECCION_PENDIENTE: "Corrección pendiente",
  PENDIENTE_REVISION: "Pendiente de revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

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
  if (inspection.status !== "EN_PROGRESO" && inspection.status !== "CORRECCION_PENDIENTE") {
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

  return { ...inspection, status: "PENDIENTE_REVISION" };
}

export const inspectionDecisionLabels = {
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
} as const;

export function reviewInspection(
  inspection: Inspection,
  decision: "APROBADA" | "RECHAZADA",
): Inspection {
  if (inspection.status !== "PENDIENTE_REVISION") {
    throw new InspectionRuleError("Solo una inspección pendiente de revisión puede evaluarse.");
  }
  if (decision === "APROBADA") return { ...inspection, status: "APROBADA" };
  return { ...inspection, status: "CORRECCION_PENDIENTE" };
}

export function cancelInspection(inspection: Inspection): Inspection {
  if (["APROBADA", "RECHAZADA", "CANCELADA"].includes(inspection.status)) {
    throw new InspectionRuleError("La inspección ya se encuentra en un estado final.");
  }
  return { ...inspection, status: "CANCELADA" };
}
