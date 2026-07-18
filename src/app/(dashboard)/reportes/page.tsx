import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";

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
  const approved = data.inspectionStatuses.find((row) => row.status === "APPROVED")?._count._all ?? 0;
  const compliance = totalInspections ? Math.round((approved / totalInspections) * 1000) / 10 : 0;
  return <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-[var(--brand)]">INDICADORES SG-SST</p><h1 className="mt-2 text-3xl font-semibold">Reportes</h1><p className="mt-2 text-sm text-[var(--muted)]">Información operativa calculada desde la fuente transaccional.</p></div><a className="rounded-xl bg-[var(--brand)] px-5 py-3 text-center text-sm font-semibold text-white" href="/api/v1/reports/inspections.csv">Exportar inspecciones</a></div><section className="mt-7 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm"><p className="text-sm text-[var(--muted)]">Inspecciones</p><p className="mt-2 font-mono text-3xl font-semibold">{totalInspections}</p></article><article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm"><p className="text-sm text-[var(--muted)]">Aprobación global</p><p className="mt-2 font-mono text-3xl font-semibold">{compliance} %</p></article><article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm"><p className="text-sm text-[var(--muted)]">Acciones abiertas</p><p className="mt-2 font-mono text-3xl font-semibold">{data.openActions}</p></article></section><div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm"><h2 className="font-semibold">Inspecciones por estado</h2><div className="mt-4 space-y-3">{data.inspectionStatuses.map((row) => <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3" key={row.status}><span className="text-sm">{row.status}</span><strong className="font-mono">{row._count._all}</strong></div>)}</div></section><section className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm"><h2 className="font-semibold">Inventario por estado</h2><div className="mt-4 space-y-3">{data.inventoryStatuses.map((row) => <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3" key={row.status}><span className="text-sm">{row.status}</span><strong className="font-mono">{row._count._all}</strong></div>)}</div></section></div><section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm"><h2 className="font-semibold">Adopción por actividad</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.activities.map((activity) => <article className="rounded-xl border border-[var(--line)] p-4" key={activity.name}><p className="text-sm font-semibold">{activity.name}</p><p className="mt-2 font-mono text-2xl">{activity._count.inspections}</p><p className="text-xs text-[var(--muted)]">inspecciones</p></article>)}</div></section></main>;
}
