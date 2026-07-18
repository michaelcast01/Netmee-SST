import { getCurrentUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { inspectionStatusLabels } from "@/modules/inspections";

export const dynamic = "force-dynamic";

function csvCell(value: string | number | Date | null) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autenticado" }, { status: 401 });
  if (!hasPermission(user.permissions, "report.export")) return Response.json({ error: "Sin permiso" }, { status: 403 });
  const inspections = await getPrisma().inspection.findMany({ orderBy: { createdAt: "desc" }, include: { worker: { select: { name: true, email: true } }, activity: { select: { name: true } }, _count: { select: { evidence: true, items: true } } } });
  const rows = [
    ["Código", "Actividad", "Trabajador", "Correo", "Estado", "Elementos", "Evidencias", "Creada", "Finalizada"],
    ...inspections.map((inspection) => [inspection.code, inspection.activity.name, inspection.worker.name, inspection.worker.email, inspectionStatusLabels[inspection.status], inspection._count.items, inspection._count.evidence, inspection.createdAt, inspection.completedAt]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="inspecciones-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } });
}
