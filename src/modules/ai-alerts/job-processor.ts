import { getPrisma } from "@/lib/db/prisma";
import { createEvidenceDownloadUrl } from "@/lib/storage/s3";
import { getPpeAnalysisService } from "@/modules/ai-alerts/analysis-service";

const RETRY_DELAYS_MS = [2_000, 8_000, 30_000] as const;

function confidenceThreshold() {
  const configured = Number(process.env.AI_CONFIDENCE_THRESHOLD ?? "0.7");
  return Number.isFinite(configured) && configured >= 0 && configured <= 1 ? configured : 0.7;
}

export async function processAnalysisJob(jobId?: string) {
  const prisma = getPrisma();
  const candidate = await prisma.aiAnalysisJob.findFirst({
    where: {
      ...(jobId ? { id: jobId } : {}),
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: RETRY_DELAYS_MS.length },
      runAfter: { lte: new Date() },
      lockedAt: null,
    },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return { processed: false as const };

  const locked = await prisma.aiAnalysisJob.updateMany({
    where: { id: candidate.id, status: candidate.status, lockedAt: null },
    data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } },
  });
  if (locked.count !== 1) return { processed: false as const };

  try {
    const analysis = await prisma.aiAnalysis.findUniqueOrThrow({
      where: { id: candidate.analysisId },
      include: { evidence: { include: { inspection: { include: { items: { include: { ppeType: true } } } } } } },
    });
    await prisma.aiAnalysis.update({ where: { id: analysis.id }, data: { status: "PROCESSING", errorCode: null } });
    const result = await getPpeAnalysisService().analyze({
      evidenceId: analysis.evidenceId,
      imageUrl: await createEvidenceDownloadUrl(analysis.evidence.storagePath),
      requiredPpe: analysis.evidence.inspection.items.filter((item) => item.required).map((item) => item.ppeType.name),
    });
    const lowConfidence = !result.personDetected || result.uncertainPpe.length > 0 || result.confidence < confidenceThreshold();
    const status = lowConfidence ? "LOW_CONFIDENCE" : result.missingPpe.length ? "DETECTED" : "NOT_DETECTED";
    await prisma.$transaction([
      prisma.aiAnalysis.update({
        where: { id: analysis.id },
        data: {
          status,
          confidence: result.confidence,
          predictedCompliant: result.compliant,
          needsReview: true,
          modelVersion: result.modelUsed ?? analysis.modelVersion,
          result,
        },
      }),
      prisma.aiAnalysisJob.update({ where: { id: candidate.id }, data: { status: "COMPLETED", lockedAt: null, lastError: null } }),
    ]);
    return { processed: true as const, analysisId: analysis.id, status };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Error desconocido";
    const currentAttempt = candidate.attempts + 1;
    const retryDelay = RETRY_DELAYS_MS[Math.min(currentAttempt - 1, RETRY_DELAYS_MS.length - 1)];
    const willRetry = currentAttempt < RETRY_DELAYS_MS.length;
    await prisma.$transaction([
      prisma.aiAnalysis.update({
        where: { id: candidate.analysisId },
        data: { status: willRetry ? "PENDING" : "ERROR", errorCode: "ANALYSIS_FAILED" },
      }),
      prisma.aiAnalysisJob.update({
        where: { id: candidate.id },
        data: { status: "FAILED", lockedAt: null, lastError: message, runAfter: new Date(Date.now() + retryDelay) },
      }),
    ]);
    throw error;
  }
}
