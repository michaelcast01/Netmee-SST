import type { Metadata } from "next";
import { BarChart3, Download } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";
import { inspectionStatusLabels } from "@/modules/inspections";

export const metadata: Metadata = { title: "Reportes" };

async function getReportData() {
  const prisma = getPrisma();
  const [inspectionStatuses, inventoryStatuses, openActions, activities] = await Promise.all([
    prisma.inspection.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.ppeItem.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.correctiveAction.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
    prisma.activity.findMany({ orderBy: { name: "asc" }, select: { name: true, _count: { select: { inspections: true } } } }),
  ]);
  return { inspectionStatuses, inventoryStatuses, openActions, activities };
}

export default async function ReportsPage() {
  await requirePermission("report.export");
  const data = await getReportData();
  const totalInspections = data.inspectionStatuses.reduce((sum, row) => sum + row._count._all, 0);
  const approved = data.inspectionStatuses.find((row) => row.status === "APROBADA")?._count._all ?? 0;
  const compliance = totalInspections ? Math.round((approved / totalInspections) * 1000) / 10 : 0;
  return <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8"><PageHeader action={<a className="brand-cta inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-center text-sm font-semibold text-white" href="/api/v1/reports/inspections.csv"><Download aria-hidden="true" size={17}/>Exportar inspecciones</a>} description="Información operativa calculada desde la fuente transaccional." eyebrow="INDICADORES SG-SST" icon={BarChart3} title="Reportes"/><section className="mt-7 grid gap-4 sm:grid-cols-3"><article className="metric-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Inspecciones</p><p className="mt-2 font-mono text-3xl font-semibold">{totalInspections}</p></article><article className="metric-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Aprobación global</p><p className="mt-2 font-mono text-3xl font-semibold">{compliance} %</p></article><article className="metric-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Acciones abiertas</p><p className="mt-2 font-mono text-3xl font-semibold">{data.openActions}</p></article></section><div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="surface-card rounded-2xl p-6"><h2 className="font-semibold">Inspecciones por estado</h2><div className="mt-4 space-y-3">{data.inspectionStatuses.map((row) => <div className="data-row flex items-center justify-between rounded-xl px-4 py-3" key={row.status}><span className="text-sm">{inspectionStatusLabels[row.status]}</span><strong className="font-mono">{row._count._all}</strong></div>)}</div></section><section className="surface-card rounded-2xl p-6"><h2 className="font-semibold">Inventario por estado</h2><div className="mt-4 space-y-3">{data.inventoryStatuses.map((row) => <div className="data-row flex items-center justify-between rounded-xl px-4 py-3" key={row.status}><span className="text-sm">{row.status}</span><strong className="font-mono">{row._count._all}</strong></div>)}</div></section></div><section className="surface-card mt-6 rounded-2xl p-6"><h2 className="font-semibold">Adopción por actividad</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.activities.map((activity) => <article className="data-row rounded-xl border border-[var(--line)] p-4" key={activity.name}><p className="text-sm font-semibold">{activity.name}</p><p className="mt-2 font-mono text-2xl">{activity._count.inspections}</p><p className="text-xs text-[var(--muted)]">inspecciones</p></article>)}</div></section></main>;
}
