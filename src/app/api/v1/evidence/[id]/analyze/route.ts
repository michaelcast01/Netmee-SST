import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { isAiEnabled } from "@/modules/ai-alerts/analysis-service";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (!isAiEnabled()) return Response.json({ error: "El análisis de IA no está habilitado" }, { status: 503 });
  const { id } = await params;
  const evidence = await getPrisma().evidence.findUnique({ where: { id }, select: { inspection: { select: { workerId: true } } } });
  if (!evidence) return Response.json({ error: "Evidencia no encontrada" }, { status: 404 });
  if (evidence.inspection.workerId !== user.id && !hasPermission(user.permissions, "inspection.review")) return Response.json({ error: "Sin permiso" }, { status: 403 });
  const analysis = await getPrisma().aiAnalysis.create({ data: { evidenceId: id, provider: "http", modelVersion: process.env.AI_MODEL_VERSION ?? "ppe-detector-v1", job: { create: {} } } });
  return Response.json({ data: { id: analysis.id, status: analysis.status } }, { status: 202 });
}
