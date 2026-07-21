import { after } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { getAiModelVersion, getAiProvider, isAiEnabled } from "@/modules/ai-alerts/analysis-service";
import { processAnalysisJob } from "@/modules/ai-alerts/job-processor";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function authorizeEvidence(id: string) {
  const user = await getCurrentUser();
  if (!user) return { response: Response.json({ error: "No autenticado" }, { status: 401 }) };
  const evidence = await getPrisma().evidence.findUnique({
    where: { id },
    select: { id: true, inspection: { select: { workerId: true } } },
  });
  if (!evidence) return { response: Response.json({ error: "Evidencia no encontrada" }, { status: 404 }) };
  if (evidence.inspection.workerId !== user.id && !hasPermission(user.permissions, "inspection.review")) {
    return { response: Response.json({ error: "Sin permiso" }, { status: 403 }) };
  }
  return { evidence, user };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = await authorizeEvidence(id);
  if ("response" in authorization) return authorization.response;
  const analysis = await getPrisma().aiAnalysis.findFirst({
    where: { evidenceId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, confidence: true, result: true, modelVersion: true, createdAt: true },
  });
  return Response.json({
    data: analysis ? { ...analysis, confidence: analysis.confidence === null ? null : Number(analysis.confidence) } : null,
  });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAiEnabled()) return Response.json({ error: "El análisis de IA no está habilitado" }, { status: 503 });
  const { id } = await params;
  const authorization = await authorizeEvidence(id);
  if ("response" in authorization) return authorization.response;

  const current = await getPrisma().aiAnalysis.findFirst({
    where: { evidenceId: id, status: { in: ["PENDING", "PROCESSING"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  if (current) return Response.json({ data: current });

  const analysis = await getPrisma().$transaction(async (tx) => {
    const created = await tx.aiAnalysis.create({
      data: {
        evidenceId: id,
        provider: getAiProvider(),
        modelVersion: getAiModelVersion(),
        job: { create: {} },
      },
      include: { job: { select: { id: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId: authorization.user.id,
        action: "evidence.ai_analysis_requested",
        entityType: "evidence",
        entityId: id,
        metadata: { analysisId: created.id, provider: created.provider, modelVersion: created.modelVersion },
      },
    });
    return created;
  });

  if (analysis.job) after(() => processAnalysisJob(analysis.job!.id).catch(() => undefined));
  return Response.json({ data: { id: analysis.id, status: analysis.status } }, { status: 202 });
}
