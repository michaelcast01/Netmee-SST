import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { createInspectionPdf } from "@/modules/reports/inspection-pdf";

export const dynamic = "force-dynamic";

function analysisSummary(result: unknown) {
  if (!result || typeof result !== "object" || !("summary" in result)) return "Sin resumen estructurado";
  return typeof result.summary === "string" ? result.summary : "Sin resumen estructurado";
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  const { id } = await params;
  const inspection = await getPrisma().inspection.findUnique({
    where: { id },
    include: {
      worker: { select: { name: true } },
      activity: { select: { name: true } },
      items: {
        include: { ppeType: { select: { name: true } } },
        orderBy: { ppeType: { name: "asc" } },
      },
      evidence: {
        select: {
          fileName: true,
          checksum: true,
          retentionUntil: true,
          legalHold: true,
          analyses: {
            orderBy: { createdAt: "asc" },
            select: {
              modelVersion: true,
              confidence: true,
              result: true,
              validations: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: {
                  decision: true,
                  notes: true,
                  createdAt: true,
                  validatedBy: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      history: {
        include: { changedBy: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      approvals: {
        include: { reviewer: { select: { email: true } } },
        orderBy: { signedAt: "asc" },
      },
    },
  });
  if (!inspection) return Response.json({ error: "Inspección no encontrada" }, { status: 404 });
  if (
    inspection.workerId !== user.id
    && !hasPermission(user.permissions, "inspection.review")
    && !hasPermission(user.permissions, "report.export")
  ) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }
  const bytes = await createInspectionPdf({
    code: inspection.code,
    status: inspection.status,
    activity: inspection.activity.name,
    worker: inspection.worker.name,
    createdAt: inspection.createdAt,
    items: inspection.items.map((item) => ({
      name: item.ppeType.name,
      required: item.required,
      compliant: item.compliant,
      observation: item.observation,
    })),
    evidence: inspection.evidence.map((evidence) => ({
      fileName: evidence.fileName,
      checksum: evidence.checksum,
      retentionUntil: evidence.retentionUntil,
      legalHold: evidence.legalHold,
    })),
    aiReviews: inspection.evidence.flatMap((evidence) => evidence.analyses.map((analysis) => {
      const validation = analysis.validations[0];
      return {
        modelVersion: analysis.modelVersion,
        confidence: analysis.confidence === null ? null : Number(analysis.confidence),
        summary: analysisSummary(analysis.result),
        decision: validation?.decision ?? null,
        validator: validation?.validatedBy.name ?? null,
        notes: validation?.notes ?? null,
        validatedAt: validation?.createdAt ?? null,
      };
    })),
    history: inspection.history.map((entry) => ({
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      changedBy: entry.changedBy.name,
      reason: entry.reason,
      createdAt: entry.createdAt,
    })),
    approvals: inspection.approvals.map((approval) => ({
      decision: approval.decision,
      signerName: approval.signerName,
      reviewerEmail: approval.reviewer.email,
      reason: approval.reason,
      signatureHash: approval.signatureHash,
      signedAt: approval.signedAt,
    })),
  });
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${inspection.code}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
