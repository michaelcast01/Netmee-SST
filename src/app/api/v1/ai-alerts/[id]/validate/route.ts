import { z } from "zod";
import { randomBytes } from "node:crypto";

import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";

const schema = z.object({ confirmed: z.boolean(), notes: z.string().trim().max(500).optional() });

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
      evidence: { select: { inspection: { select: { id: true, workerId: true, code: true } } } },
    },
  });
  if (!analysis) return Response.json({ error: "Análisis no encontrado" }, { status: 404 });
  if (!hasPermission(user.permissions, "inspection.review")) return Response.json({ error: "Solo un responsable SST puede validar el análisis" }, { status: 403 });
  if (!analysis.needsReview) return Response.json({ error: "Este análisis ya fue validado" }, { status: 409 });

  const result = analysis.result && typeof analysis.result === "object" ? analysis.result as { missingPpe?: unknown } : null;
  const missingPpe = Array.isArray(result?.missingPpe) ? result.missingPpe.filter((item): item is string => typeof item === "string").slice(0, 50) : [];
  const status = body.data.confirmed ? "CONFIRMED" : "DISCARDED";
  let correctiveActionCreated = false;
  await getPrisma().$transaction(async (tx) => {
    await tx.aiValidation.create({ data: { analysisId: id, validatedById: user.id, confirmed: body.data.confirmed, notes: body.data.notes || null } });
    await tx.aiAnalysis.update({ where: { id }, data: { status, needsReview: false } });

    if (body.data.confirmed && missingPpe.length) {
      const existing = await tx.auditLog.findFirst({ where: { action: "ai.corrective_action_created", entityType: "ai_analysis", entityId: id } });
      if (!existing) {
        const incident = await tx.incident.create({
          data: {
            code: `NOV-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`,
            inspectionId: analysis.evidence.inspection.id,
            title: `EPP faltante detectado por IA — ${analysis.evidence.inspection.code}`,
            description: `Validación humana confirmó ausencia de: ${missingPpe.join(", ")}. ${body.data.notes ?? ""}`.trim(),
            severity: "HIGH",
            status: "IN_PROGRESS",
            reportedById: user.id,
            responsibleId: user.id,
          },
        });
        const action = await tx.correctiveAction.create({
          data: {
            incidentId: incident.id,
            responsibleId: user.id,
            description: `Verificar entrega y uso correcto de: ${missingPpe.join(", ")}.`,
            dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        });
        await tx.auditLog.create({
          data: { actorId: user.id, action: "ai.corrective_action_created", entityType: "ai_analysis", entityId: id, metadata: { incidentId: incident.id, correctiveActionId: action.id } },
        });
        correctiveActionCreated = true;
      }
    }
  });
  return Response.json({ data: { status, correctiveActionCreated } });
}
