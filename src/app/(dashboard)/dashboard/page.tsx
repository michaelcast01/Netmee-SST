import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import {
  dashboardPeriods,
  getDashboardPeriodBounds,
  parseDashboardPeriod,
  percentage,
  trendPercentage,
} from "@/modules/dashboard/period";

export const metadata: Metadata = { title: "Panel" };

function displayPercentage(value: number | null) {
  return value === null ? "Sin datos" : `${value} %`;
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[var(--muted)]">Sin periodo comparable</span>;
  if (value === 0) return <span className="text-[var(--muted)]">Sin cambio frente al periodo anterior</span>;
  return <span className={value > 0 ? "text-emerald-700" : "text-rose-700"}>{value > 0 ? "↑" : "↓"} {Math.abs(value)} % frente al periodo anterior</span>;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const user = await requireUser();
  const canReviewAi = hasPermission(user.permissions, "inspection.review");
  const period = parseDashboardPeriod((await searchParams).period);
  const { currentStart, previousStart, now, days } = getDashboardPeriodBounds(period);
  const prisma = getPrisma();
  const currentWindow = { createdAt: { gte: currentStart, lte: now } };
  const previousWindow = { createdAt: { gte: previousStart, lt: currentStart } };

  const [
    predictions,
    previousPredictions,
    validations,
    pendingReviews,
    averageConfidence,
    inspectionsInPeriod,
    inspectionsPreviousPeriod,
    inspectionsToday,
    overdueActions,
  ] = await Promise.all([
    prisma.aiAnalysis.groupBy({ by: ["predictedCompliant"], where: { ...currentWindow, predictedCompliant: { not: null } }, _count: { _all: true } }),
    prisma.aiAnalysis.groupBy({ by: ["predictedCompliant"], where: { ...previousWindow, predictedCompliant: { not: null } }, _count: { _all: true } }),
    prisma.aiValidation.groupBy({ by: ["confirmed"], where: currentWindow, _count: { _all: true } }),
    prisma.aiAnalysis.count({ where: { ...currentWindow, needsReview: true, status: { in: ["DETECTED", "NOT_DETECTED", "LOW_CONFIDENCE"] } } }),
    prisma.aiAnalysis.aggregate({ where: { ...currentWindow, confidence: { not: null } }, _avg: { confidence: true } }),
    prisma.inspection.count({ where: currentWindow }),
    prisma.inspection.count({ where: previousWindow }),
    prisma.inspection.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.correctiveAction.count({ where: { dueAt: { lt: now }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
  ]);

  const compliant = predictions.find((row) => row.predictedCompliant === true)?._count._all ?? 0;
  const nonCompliant = predictions.find((row) => row.predictedCompliant === false)?._count._all ?? 0;
  const totalPredictions = compliant + nonCompliant;
  const previousCompliant = previousPredictions.find((row) => row.predictedCompliant === true)?._count._all ?? 0;
  const previousTotalPredictions = previousPredictions.reduce((sum, row) => sum + row._count._all, 0);
  const confirmed = validations.find((row) => row.confirmed)?._count._all ?? 0;
  const discarded = validations.find((row) => !row.confirmed)?._count._all ?? 0;
  const totalValidations = confirmed + discarded;
  const compliance = percentage(compliant, totalPredictions);
  const previousCompliance = percentage(previousCompliant, previousTotalPredictions);
  const humanAgreement = percentage(confirmed, totalValidations);
  const confidence = averageConfidence._avg.confidence === null ? null : Math.round(Number(averageConfidence._avg.confidence) * 1000) / 10;
  const complianceTrend = compliance === null || previousCompliance === null ? null : Math.round((compliance - previousCompliance) * 10) / 10;
  const inspectionTrend = trendPercentage(inspectionsInPeriod, inspectionsPreviousPeriod);

  const metrics = [
    { label: "Cumplimiento detectado", value: displayPercentage(compliance), detail: `${totalPredictions} análisis concluyentes`, trend: complianceTrend, trendUnit: "puntos" },
    { label: "Coincidencia con SST", value: displayPercentage(humanAgreement), detail: `${totalValidations} resultados validados` },
    { label: "Confianza promedio", value: displayPercentage(confidence), detail: "Promedio de evaluaciones IA" },
    { label: "Pendientes de validar", value: String(pendingReviews), detail: "Requieren decisión humana" },
  ];

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="hero-panel rounded-3xl px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="eyebrow text-xs font-semibold text-violet-200">CENTRO DE CONTROL</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Hola, {user.name.split(" ")[0]}.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-violet-100/85 sm:text-base">Una visión clara del cumplimiento, la precisión de la IA y las acciones que protegen a tu equipo.</p>
            <div className="mt-6 inline-flex items-center rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-violet-100"><span className="mr-2 size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />Sistema operativo</div>
          </div>
          <form aria-label="Periodo de indicadores" className="rounded-2xl border border-white/15 bg-black/15 p-3" method="get">
            <label className="mb-2 block text-xs font-semibold text-violet-100" htmlFor="dashboard-period">Periodo de análisis</label>
            <div className="flex gap-2">
              <select className="rounded-xl border border-white/20 bg-[#21103f] px-3 py-2 text-sm text-white" defaultValue={period} id="dashboard-period" name="period">
                {dashboardPeriods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <button className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#2a1552]" type="submit">Aplicar</button>
            </div>
          </form>
        </div>
      </section>

      {totalPredictions === 0 ? (
        <section className="surface-card mt-6 flex flex-col justify-between gap-5 rounded-2xl border-l-4 border-l-[var(--brand)] p-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-strong)]">Primera medición</p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--plum)]">Aún no hay análisis concluyentes en los últimos {days} días</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">Crea una inspección, carga una fotografía de evidencia y ejecuta el análisis. Cuando SST valide el resultado, el panel mostrará cumplimiento, confianza y coincidencia humana.</p>
          </div>
          <Link className="brand-cta shrink-0 rounded-xl px-5 py-3 text-center text-sm font-semibold text-white" href="/inspecciones/nueva">Crear primera medición</Link>
        </section>
      ) : null}

      <section aria-label={`Indicadores de los últimos ${days} días`} className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article className="metric-card rounded-2xl p-5" key={metric.label}>
            <p className="text-sm font-medium text-[var(--muted)]">{metric.label}</p>
            <p className={`mt-3 font-mono font-semibold tracking-tight text-[var(--plum)] ${metric.value === "Sin datos" ? "text-xl" : "text-3xl"}`}>{metric.value}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">{metric.detail}</p>
            {"trend" in metric && metric.trend !== undefined ? <p className="mt-3 text-xs"><Trend value={metric.trend} />{metric.trend !== null && metric.trend !== 0 ? ` ${metric.trendUnit}` : ""}</p> : null}
          </article>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="surface-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4"><h2 className="font-semibold text-[var(--plum)]">Cumplimiento visual</h2><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">EPP</span></div>
          {compliance === null ? <p className="mt-6 rounded-xl bg-[var(--brand-soft)] p-4 text-sm text-[var(--muted)]">La distribución aparecerá cuando exista al menos un análisis concluyente.</p> : <><div className="mt-6 h-3 overflow-hidden rounded-full bg-red-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${compliance}%` }} /></div><div className="mt-3 flex justify-between text-xs text-[var(--muted)]"><span>{compliant} cumplen</span><span>{nonCompliant} con hallazgos</span></div></>}
        </article>
        <article className="surface-card rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4"><h2 className="font-semibold text-[var(--plum)]">Precisión supervisada</h2><span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">IA + SST</span></div>
          {humanAgreement === null ? <p className="mt-6 rounded-xl bg-[var(--brand-soft)] p-4 text-sm text-[var(--muted)]">La coincidencia aparecerá después de la primera validación humana.</p> : <><div className="mt-6 h-3 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-[var(--brand-strong)]" style={{ width: `${humanAgreement}%` }} /></div><div className="mt-3 flex justify-between text-xs text-[var(--muted)]"><span>{confirmed} confirmados</span><span>{discarded} descartados</span></div></>}
        </article>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="surface-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Inspecciones del periodo</p><p className="mt-2 font-mono text-2xl font-semibold text-[var(--plum)]">{inspectionsInPeriod}</p><p className="mt-2 text-xs"><Trend value={inspectionTrend} /></p></article>
        <article className="surface-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Inspecciones creadas hoy</p><p className="mt-2 font-mono text-2xl font-semibold text-[var(--plum)]">{inspectionsToday}</p></article>
        <article className="surface-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Acciones vencidas</p><p className="mt-2 font-mono text-2xl font-semibold text-[var(--plum)]">{overdueActions}</p></article>
        {canReviewAi ? <Link className="brand-cta rounded-2xl p-5 text-white" href="/validaciones-ia"><p className="text-sm text-violet-100/85">Cola de revisión</p><p className="mt-2 font-semibold">Abrir validaciones de IA →</p></Link> : null}
      </section>
    </main>
  );
}
