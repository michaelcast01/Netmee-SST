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
  const compliance = totalInspections ? Math.round((approved / totalInspections) * 1000) / 10 : null;

  return (
    <main className="mx-auto max-w-[90rem] px-6 py-8 lg:px-8">
      <PageHeader description="Información operativa calculada desde la fuente transaccional." eyebrow="INDICADORES SG-SST" icon={BarChart3} title="Reportes" />

      <section className="surface-card mt-7 rounded-2xl p-5">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
          <div><h2 className="font-semibold">Exportar inspecciones</h2><p className="mt-1 text-sm text-[var(--muted)]">El archivo se genera por lotes y admite hasta 10.000 registros por descarga.</p></div>
        </div>
        <form action="/api/v1/reports/inspections.csv" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_.7fr_auto]" method="get">
          <label className="text-xs font-semibold text-[var(--muted)]">Estado
            <select className="auth-input text-sm" name="status">
              <option value="">Todos los estados</option>
              {Object.entries(inspectionStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">Desde
            <input className="auth-input text-sm" name="from" type="date" />
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">Hasta
            <input className="auth-input text-sm" name="to" type="date" />
          </label>
          <label className="text-xs font-semibold text-[var(--muted)]">Máximo
            <select className="auth-input text-sm" defaultValue="1000" name="limit">
              <option value="500">500</option><option value="1000">1.000</option><option value="5000">5.000</option><option value="10000">10.000</option>
            </select>
          </label>
          <button className="brand-cta mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white" type="submit"><Download aria-hidden="true" size={17} />Descargar CSV</button>
        </form>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <article className="metric-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Inspecciones</p><p className="mt-2 font-mono text-3xl font-semibold">{totalInspections}</p></article>
        <article className="metric-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Aprobación global</p><p className={`mt-2 font-mono font-semibold ${compliance === null ? "text-xl" : "text-3xl"}`}>{compliance === null ? "Sin datos" : `${compliance} %`}</p></article>
        <article className="metric-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Acciones abiertas</p><p className="mt-2 font-mono text-3xl font-semibold">{data.openActions}</p></article>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface-card rounded-2xl p-6"><h2 className="font-semibold">Inspecciones por estado</h2><div className="mt-4 space-y-3">{data.inspectionStatuses.map((row) => <div className="data-row flex items-center justify-between rounded-xl px-4 py-3" key={row.status}><span className="text-sm">{inspectionStatusLabels[row.status]}</span><strong className="font-mono">{row._count._all}</strong></div>)}</div></section>
        <section className="surface-card rounded-2xl p-6"><h2 className="font-semibold">Inventario por estado</h2><div className="mt-4 space-y-3">{data.inventoryStatuses.map((row) => <div className="data-row flex items-center justify-between rounded-xl px-4 py-3" key={row.status}><span className="text-sm">{row.status}</span><strong className="font-mono">{row._count._all}</strong></div>)}</div></section>
      </div>
      <section className="surface-card mt-6 rounded-2xl p-6"><h2 className="font-semibold">Adopción por actividad</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.activities.map((activity) => <article className="data-row rounded-xl border border-[var(--line)] p-4" key={activity.name}><p className="text-sm font-semibold">{activity.name}</p><p className="mt-2 font-mono text-2xl">{activity._count.inspections}</p><p className="text-xs text-[var(--muted)]">inspecciones</p></article>)}</div></section>
    </main>
  );
}
