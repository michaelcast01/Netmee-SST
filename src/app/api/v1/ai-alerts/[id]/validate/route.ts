import { z } from "zod";
import { randomBytes } from "node:crypto";

import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.union([
  z.object({
    decision: z.enum(["CUMPLE", "NO_CUMPLE", "NO_CONCLUYENTE"]),
    notes: z.string().trim().max(500).optional(),
  }),
  z.object({
    confirmed: z.boolean(),
    notes: z.string().trim().max(500).optional(),
  }),
]);

type AnalysisResult = {
  compliant?: unknown;
  missingPpe?: unknown;
  assessments?: unknown;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  const body = schema.safeParse(await request.json());
  if (!body.success) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  const { id } = await params;
  const analysis = await getPrisma().aiAnalysis.findUnique({
    where: { id },
    select: {
      needsReview: true,
      result: true,
      predictedCompliant: true,
      evidence: {
        select: {
          inspection: {
            select: { id: true, workerId: true, code: true, status: true },
          },
        },
      },
    },
  });
  if (!analysis) return Response.json({ error: "Análisis no encontrado" }, { status: 404 });
  if (!hasPermission(user.permissions, "inspection.review")) return Response.json({ error: "Solo un responsable SST puede validar el análisis" }, { status: 403 });
  if (!analysis.needsReview) return Response.json({ error: "Este análisis ya fue validado" }, { status: 409 });

  const result = analysis.result && typeof analysis.result === "object" ? analysis.result as AnalysisResult : null;
  const missingPpe = Array.isArray(result?.missingPpe) ? result.missingPpe.filter((item): item is string => typeof item === "string").slice(0, 50) : [];
  const decision = "decision" in body.data
    ? body.data.decision
    : body.data.confirmed
      ? result?.compliant === true ? "CUMPLE" : "NO_CUMPLE"
      : "NO_CONCLUYENTE";
  const humanCompliant = decision === "CUMPLE" ? true : decision === "NO_CUMPLE" ? false : null;
  const confirmed = humanCompliant !== null && analysis.predictedCompliant === humanCompliant;
  const status = confirmed ? "CONFIRMED" : "DISCARDED";
  let correctiveActionCreated = false;
  let inspectionReturnedForCorrection = false;
  await getPrisma().$transaction(async (tx) => {
    await tx.aiValidation.create({
      data: {
        analysisId: id,
        validatedById: user.id,
        confirmed,
        decision,
        notes: body.data.notes || null,
      },
    });
    await tx.aiAnalysis.update({ where: { id }, data: { status, needsReview: false } });

    if (decision === "CUMPLE") {
      await tx.inspectionItem.updateMany({
        where: {
          inspectionId: analysis.evidence.inspection.id,
          required: true,
        },
        data: { compliant: true },
      });
    } else if (decision === "NO_CUMPLE" && missingPpe.length) {
      await tx.inspectionItem.updateMany({
        where: {
          inspectionId: analysis.evidence.inspection.id,
          ppeType: { name: { in: missingPpe } },
        },
        data: { compliant: false },
      });
    }

    if (
      decision === "NO_CONCLUYENTE"
      && analysis.evidence.inspection.status === "PENDIENTE_REVISION"
    ) {
      const changed = await tx.inspection.updateMany({
        where: {
          id: analysis.evidence.inspection.id,
          status: "PENDIENTE_REVISION",
        },
        data: { status: "CORRECCION_PENDIENTE" },
      });
      if (changed.count === 1) {
        await tx.inspectionStatusHistory.create({
          data: {
            inspectionId: analysis.evidence.inspection.id,
            fromStatus: "PENDIENTE_REVISION",
            toStatus: "CORRECCION_PENDIENTE",
            changedById: user.id,
            reason: body.data.notes || "La evidencia fotográfica no permite concluir el cumplimiento.",
          },
        });
        inspectionReturnedForCorrection = true;
      }
    }

    if (decision === "NO_CUMPLE") {
      const existing = await tx.auditLog.findFirst({ where: { action: "ai.corrective_action_created", entityType: "ai_analysis", entityId: id } });
      if (!existing) {
        const finding = missingPpe.length ? missingPpe.join(", ") : "incumplimiento observado por SST";
        const incident = await tx.incident.create({
          data: {
            code: `NOV-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`,
            inspectionId: analysis.evidence.inspection.id,
            title: `Incumplimiento de EPP — ${analysis.evidence.inspection.code}`,
            description: `La revisión humana determinó: ${finding}. ${body.data.notes ?? ""}`.trim(),
            severity: "HIGH",
            status: "IN_PROGRESS",
            reportedById: user.id,
            responsibleId: analysis.evidence.inspection.workerId,
          },
        });
        const action = await tx.correctiveAction.create({
          data: {
            incidentId: incident.id,
            responsibleId: analysis.evidence.inspection.workerId,
            description: missingPpe.length
              ? `Verificar entrega y uso correcto de: ${missingPpe.join(", ")}.`
              : "Realizar una nueva verificación fotográfica y corregir el incumplimiento reportado.",
            dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        });
        await tx.notification.upsert({
          where: {
            userId_dedupeKey: {
              userId: analysis.evidence.inspection.workerId,
              dedupeKey: `ai-noncompliance:${id}`,
            },
          },
          create: {
            userId: analysis.evidence.inspection.workerId,
            type: "CRITICAL_FINDING",
            title: "Revisión de EPP requiere corrección",
            message: `La evidencia de ${analysis.evidence.inspection.code} fue marcada como no conforme.`,
            href: `/inspecciones/${analysis.evidence.inspection.id}`,
            dedupeKey: `ai-noncompliance:${id}`,
          },
          update: {},
        });
        await tx.auditLog.create({
          data: { actorId: user.id, action: "ai.corrective_action_created", entityType: "ai_analysis", entityId: id, metadata: { incidentId: incident.id, correctiveActionId: action.id } },
        });
        correctiveActionCreated = true;
      }
    }
    if (decision === "NO_CONCLUYENTE") {
      await tx.notification.upsert({
        where: {
          userId_dedupeKey: {
            userId: analysis.evidence.inspection.workerId,
            dedupeKey: `ai-new-photo:${id}`,
          },
        },
        create: {
          userId: analysis.evidence.inspection.workerId,
          type: "INSPECTION_PENDING",
          title: "Nueva fotografía requerida",
          message: `SST solicitó una nueva evidencia para ${analysis.evidence.inspection.code}.`,
          href: `/inspecciones/${analysis.evidence.inspection.id}`,
          dedupeKey: `ai-new-photo:${id}`,
        },
        update: {},
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "ai.validation.completed",
        entityType: "ai_analysis",
        entityId: id,
        metadata: { decision, agreesWithAi: confirmed },
      },
    });
  });
  return Response.json({
    data: { status, decision, correctiveActionCreated, inspectionReturnedForCorrection },
  });
}
