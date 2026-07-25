import { describe, expect, it } from "vitest";

import { createPpeItemSchema, parsePpeExpiry } from "./item-input";

describe("createPpeItemSchema", () => {
  it("normaliza campos opcionales vacíos", () => {
    expect(createPpeItemSchema.parse({
      ppeTypeId: "helmet",
      serialNumber: " ",
      size: "",
      expiresAt: "",
    })).toEqual({
      ppeTypeId: "helmet",
      serialNumber: undefined,
      size: undefined,
      expiresAt: undefined,
    });
  });

  it("rechaza fechas ambiguas", () => {
    expect(() => createPpeItemSchema.parse({
      ppeTypeId: "helmet",
      expiresAt: "25/07/2026",
    })).toThrow();
  });
});

describe("parsePpeExpiry", () => {
  it("conserva el día seleccionado independientemente de la zona horaria", () => {
    expect(parsePpeExpiry("2027-01-15")?.toISOString()).toBe("2027-01-15T12:00:00.000Z");
  });
});
