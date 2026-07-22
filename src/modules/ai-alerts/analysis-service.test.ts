import { afterEach, describe, expect, it, vi } from "vitest";

import { getPpeAnalysisService } from "./analysis-service";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("GeminiPPEAnalysisService", () => {
  it("envía la imagen con esquema estructurado y normaliza el resultado", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "gemini-test";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { "content-type": "image/jpeg" } }))
      .mockResolvedValueOnce(Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          personDetected: true,
          imageQuality: "GOOD",
          summary: "La persona usa casco, pero no se observan gafas.",
          items: [
            { name: "Casco", status: "DETECTED", confidence: 0.98, reason: "Visible sobre la cabeza." },
            { name: "Gafas", status: "MISSING", confidence: 0.92, reason: "El rostro está visible sin gafas." },
          ],
        }) }] } }],
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPpeAnalysisService().analyze({
      evidenceId: "evidence-1",
      imageUrl: "https://storage.test/evidence.jpg",
      requiredPpe: ["Casco", "Gafas"],
    });

    expect(result.compliant).toBe(false);
    expect(result.detectedPpe).toEqual(["Casco"]);
    expect(result.missingPpe).toEqual(["Gafas"]);
    expect(result.uncertainPpe).toEqual([]);
    const geminiRequest = fetchMock.mock.calls[1];
    expect(geminiRequest[0]).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    expect(geminiRequest[1].headers["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(geminiRequest[1].body as string);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseJsonSchema.properties.items.minItems).toBe(2);
  });

  it("marca como no concluyente cualquier EPP omitido por el proveedor", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(new Uint8Array([1]), { headers: { "content-type": "image/png" } }))
      .mockResolvedValueOnce(Response.json({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          personDetected: true,
          imageQuality: "ACCEPTABLE",
          summary: "Vista parcial.",
          items: [{ name: "Casco", status: "DETECTED", confidence: 0.9, reason: "Visible." }],
        }) }] } }],
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPpeAnalysisService().analyze({
      evidenceId: "evidence-2",
      imageUrl: "https://storage.test/evidence.png",
      requiredPpe: ["Casco", "Guantes"],
    });

    expect(result.compliant).toBe(false);
    expect(result.uncertainPpe).toEqual(["Guantes"]);
    expect(result.assessments[1].confidence).toBe(0);
  });

  it("usa el modelo alternativo cuando el principal está temporalmente saturado", async () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "primary-model";
    process.env.GEMINI_FALLBACK_MODELS = "fallback-model";
    const output = {
      personDetected: true,
      imageQuality: "GOOD",
      summary: "EPP visible.",
      items: [{ name: "Casco", status: "DETECTED", confidence: 0.95, reason: "Visible." }],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(new Uint8Array([1]), { headers: { "content-type": "image/webp" } }))
      .mockResolvedValueOnce(new Response("saturado", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await getPpeAnalysisService().analyze({ evidenceId: "evidence-3", imageUrl: "https://storage.test/evidence.webp", requiredPpe: ["Casco"] });

    expect(result.modelUsed).toBe("fallback-model");
    expect(fetchMock.mock.calls[1][0]).toContain("primary-model:generateContent");
    expect(fetchMock.mock.calls[2][0]).toContain("fallback-model:generateContent");
  });
});
