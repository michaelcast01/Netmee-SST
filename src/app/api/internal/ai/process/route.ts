import { getPrisma } from "@/lib/db/prisma";
import { createEvidenceDownloadUrl } from "@/lib/storage/s3";
import { getPpeAnalysisService } from "@/modules/ai-alerts/analysis-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.AI_WORKER_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "No autorizado" }, { status: 401 });
  const prisma = getPrisma();
  const candidate = await prisma.aiAnalysisJob.findFirst({ where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: 3 }, runAfter: { lte: new Date() } }, orderBy: { createdAt: "asc" } });
  if (!candidate) return Response.json({ data: { processed: false } });
  const locked = await prisma.aiAnalysisJob.updateMany({ where: { id: candidate.id, status: candidate.status, lockedAt: null }, data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } } });
  if (locked.count !== 1) return Response.json({ data: { processed: false } });
  try {
    const analysis = await prisma.aiAnalysis.findUniqueOrThrow({ where: { id: candidate.analysisId }, include: { evidence: { include: { inspection: { include: { items: { include: { ppeType: true } } } } } } } });
    await prisma.aiAnalysis.update({ where: { id: analysis.id }, data: { status: "PROCESSING" } });
    const result = await getPpeAnalysisService().analyze({ evidenceId: analysis.evidenceId, imageUrl: await createEvidenceDownloadUrl(analysis.evidence.storagePath), requiredPpe: analysis.evidence.inspection.items.filter((item) => item.required).map((item) => item.ppeType.name) });
    const status = result.confidence < 0.7 ? "LOW_CONFIDENCE" : result.missingPpe.length ? "DETECTED" : "NOT_DETECTED";
    await prisma.$transaction([
      prisma.aiAnalysis.update({ where: { id: analysis.id }, data: { status, confidence: result.confidence, result } }),
      prisma.aiAnalysisJob.update({ where: { id: candidate.id }, data: { status: "COMPLETED", lockedAt: null, lastError: null } }),
    ]);
    return Response.json({ data: { processed: true, analysisId: analysis.id, status } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Error desconocido";
    await prisma.$transaction([
      prisma.aiAnalysis.update({ where: { id: candidate.analysisId }, data: { status: "ERROR", errorCode: "ANALYSIS_FAILED" } }),
      prisma.aiAnalysisJob.update({ where: { id: candidate.id }, data: { status: "FAILED", lockedAt: null, lastError: message, runAfter: new Date(Date.now() + 5 * 60_000) } }),
    ]);
    return Response.json({ error: "Falló el análisis", data: { processed: true } }, { status: 502 });
  }
}
