import { z } from "zod";

export type PPEAnalysisInput = {
  evidenceId: string;
  imageUrl: string;
  requiredPpe: string[];
};

export type PPEAnalysisResult = {
  detectedPpe: string[];
  missingPpe: string[];
  confidence: number;
};

export interface PPEAnalysisService {
  analyze(input: PPEAnalysisInput): Promise<PPEAnalysisResult>;
}

const resultSchema = z.object({
  detectedPpe: z.array(z.string().max(120)).max(50),
  missingPpe: z.array(z.string().max(120)).max(50),
  confidence: z.number().min(0).max(1),
});

class HttpPPEAnalysisService implements PPEAnalysisService {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  async analyze(input: PPEAnalysisInput) {
    const response = await fetch(new URL("/v1/analyze", this.baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`El servicio de IA respondió ${response.status}.`);
    return resultSchema.parse(await response.json());
  }
}

export function getPpeAnalysisService(): PPEAnalysisService {
  const baseUrl = process.env.AI_SERVICE_URL;
  const apiKey = process.env.AI_SERVICE_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("El servicio de IA está deshabilitado.");
  return new HttpPPEAnalysisService(baseUrl, apiKey);
}

export function isAiEnabled() {
  return Boolean(process.env.AI_SERVICE_URL && process.env.AI_SERVICE_API_KEY);
}
