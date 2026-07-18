import { describe, expect, it } from "vitest";

import { InspectionRuleError, requestInspectionReview, reviewInspection } from "./inspection";

describe("requestInspectionReview", () => {
  it("envía a revisión una inspección con todos los EPP obligatorios verificados", () => {
    const result = requestInspectionReview({
      id: "inspection-1",
      status: "EN_PROGRESO",
      items: [{ id: "helmet", required: true, compliant: true }],
    });

    expect(result.status).toBe("PENDIENTE_REVISION");
  });

  it("impide el envío si un EPP obligatorio no cumple", () => {
    expect(() =>
      requestInspectionReview({
        id: "inspection-1",
        status: "IN_PROGRESS",
        items: [{ id: "harness", required: true, compliant: false }],
      }),
    ).toThrow(InspectionRuleError);
  });
});

describe("reviewInspection", () => {
  it("aprueba únicamente una inspección pendiente de revisión", () => {
    const result = reviewInspection({ id: "inspection-1", status: "PENDIENTE_REVISION", items: [] }, "APROBADA");
    expect(result.status).toBe("APROBADA");
  });

  it("rechaza una transición desde borrador", () => {
    expect(() => reviewInspection({ id: "inspection-1", status: "BORRADOR", items: [] }, "APROBADA")).toThrow(InspectionRuleError);
  });
});
