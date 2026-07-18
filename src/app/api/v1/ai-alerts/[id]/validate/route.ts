import { z } from "zod";

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
  const analysis = await getPrisma().aiAnalysis.findUnique({ where: { id }, select: { evidence: { select: { inspection: { select: { workerId: true } } } } } });
  if (!analysis) return Response.json({ error: "Análisis no encontrado" }, { status: 404 });
  if (analysis.evidence.inspection.workerId !== user.id && !hasPermission(user.permissions, "inspection.review")) return Response.json({ error: "Sin permiso" }, { status: 403 });
  await getPrisma().$transaction([
    getPrisma().aiValidation.create({ data: { analysisId: id, validatedById: user.id, confirmed: body.data.confirmed, notes: body.data.notes || null } }),
    getPrisma().aiAnalysis.update({ where: { id }, data: { status: body.data.confirmed ? "CONFIRMED" : "DISCARDED" } }),
  ]);
  return Response.json({ data: { status: body.data.confirmed ? "CONFIRMED" : "DISCARDED" } });
}
