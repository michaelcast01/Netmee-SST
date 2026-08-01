import { describe, expect, it } from "vitest";

import { objectStorageKey } from "./object-key";

describe("objectStorageKey", () => {
  it("agrega el prefijo configurado a rutas lógicas", () => {
    expect(objectStorageKey("evidence/inspection/photo.jpg", "files"))
      .toBe("files/evidence/inspection/photo.jpg");
  });

  it("evita duplicar el prefijo en rutas existentes", () => {
    expect(objectStorageKey("files/inventory/item/photo.jpg", "files/"))
      .toBe("files/inventory/item/photo.jpg");
  });

  it("conserva compatibilidad cuando no hay prefijo", () => {
    expect(objectStorageKey("inventory/item/photo.jpg", ""))
      .toBe("inventory/item/photo.jpg");
  });

  it("rechaza recorridos fuera del prefijo", () => {
    expect(() => objectStorageKey("../secrets.txt", "files")).toThrow("no es válido");
    expect(() => objectStorageKey("evidence/photo.jpg", "../files")).toThrow("no es válido");
  });
});
