import { describe, expect, it } from "vitest";

import { detectSupportedImage } from "./file-validation";

describe("detectSupportedImage", () => {
  it("detecta PNG por su firma binaria", () => {
    expect(detectSupportedImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mimeType).toBe("image/png");
  });

  it("rechaza contenido que solo pretende ser una imagen", () => {
    expect(detectSupportedImage(new TextEncoder().encode("not-an-image"))).toBeNull();
  });
});
