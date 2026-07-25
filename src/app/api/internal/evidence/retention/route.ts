import { timingSafeEqual } from "node:crypto";

import { getPrisma } from "@/lib/db/prisma";
import { logEvent, requestIdFrom } from "@/lib/observability/logger";
import { deleteEvidenceObject } from "@/lib/storage/s3";
import { processExpiredEvidence } from "@/modules/evidence/retention";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.RETENTION_WORKER_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || expected.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  if (!authorized(request)) {
    logEvent("warn", "evidence.retention.unauthorized", { requestId });
    return Response.json({ error: "No autorizado" }, { status: 401, headers: { "x-request-id": requestId } });
  }

  const db = getPrisma();
  const retryBefore = new Date(Date.now() - 15 * 60 * 1_000);
  const expired = await db.evidence.findMany({
    where: {
      legalHold: false,
      retentionUntil: { lt: new Date() },
      OR: [{ retentionDeleteStartedAt: null }, { retentionDeleteStartedAt: { lt: retryBefore } }],
    },
    orderBy: [{ retentionDeleteStartedAt: "asc" }, { retentionUntil: "asc" }],
    take: 100,
    select: { id: true, storagePath: true, inspectionId: true },
  });
  let deleted = 0;
  const failures: string[] = [];

  for (const evidence of expired) {
    const result = await processExpiredEvidence(evidence, {
      claim: async (candidate) => {
        const claimed = await db.evidence.updateMany({
          where: {
            id: candidate.id,
            legalHold: false,
            OR: [{ retentionDeleteStartedAt: null }, { retentionDeleteStartedAt: { lt: retryBefore } }],
          },
          data: { retentionDeleteStartedAt: new Date(), retentionDeleteAttempts: { increment: 1 }, retentionDeleteLastError: null },
        });
        return claimed.count === 1;
      },
      deleteObject: deleteEvidenceObject,
      finalize: async (candidate) => {
        await db.$transaction([
          db.evidence.delete({ where: { id: candidate.id } }),
          db.auditLog.create({
            data: { action: "evidence.retention.deleted", entityType: "evidence", entityId: candidate.id, metadata: { inspectionId: candidate.inspectionId, requestId } },
          }),
        ]);
      },
      markFailure: async (evidenceId, message) => {
        await db.evidence.updateMany({ where: { id: evidenceId }, data: { retentionDeleteLastError: message } });
      },
    });
    if (result.status === "deleted") deleted++;
    if (result.status === "failed") {
      failures.push(evidence.id);
      logEvent("error", "evidence.retention.failed", { requestId, evidenceId: evidence.id, error: result.message });
    }
  }

  logEvent("info", "evidence.retention.completed", { requestId, scanned: expired.length, deleted, failures: failures.length });
  return Response.json(
    { scanned: expired.length, deleted, failures },
    { headers: { "x-request-id": requestId } },
  );
}
