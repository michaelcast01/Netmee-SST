import { describe, expect, it } from "vitest";

import { createInspectionPdf } from "./inspection-pdf";

describe("createInspectionPdf", () => {
  it("generates a readable PDF with evidence and approval traceability", async () => {
    const bytes = await createInspectionPdf({
      code: "INS-2026-TEST",
      status: "APROBADA",
      activity: "Trabajo en alturas",
      worker: "Persona de prueba",
      createdAt: new Date("2026-07-24T12:00:00.000Z"),
      items: [{ name: "Casco", required: true, compliant: true, observation: null }],
      evidence: [{ fileName: "evidencia.jpg", checksum: "abc123", retentionUntil: new Date("2027-07-24"), legalHold: false }],
      aiReviews: [{ modelVersion: "gemini-test", confidence: 0.94, summary: "EPP completo", decision: "CUMPLE", validator: "SST", notes: "Verificación visual", validatedAt: new Date("2026-07-24T12:30:00.000Z") }],
      history: [{ fromStatus: null, toStatus: "BORRADOR", changedBy: "Sistema", reason: null, createdAt: new Date("2026-07-24T12:00:00.000Z") }],
      approvals: [{ decision: "APROBADA", signerName: "SST", reviewerEmail: "sst@example.com", reason: "Cumple", signatureHash: "hash", signedAt: new Date("2026-07-24T13:00:00.000Z") }],
    });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1_000);
  });
});
