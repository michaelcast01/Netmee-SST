import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Panel" };

function percentage(part: number, total: number) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const canReviewAi = hasPermission(user.permissions, "inspection.review");
  const prisma = getPrisma();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [predictions, validations, pendingReviews, averageConfidence, inspectionsToday, overdueActions] = await Promise.all([
    prisma.aiAnalysis.groupBy({ by: ["predictedCompliant"], where: { predictedCompliant: { not: null } }, _count: { _all: true } }),
    prisma.aiValidation.groupBy({ by: ["confirmed"], _count: { _all: true } }),
    prisma.aiAnalysis.count({ where: { needsReview: true, status: { in: ["DETECTED", "NOT_DETECTED", "LOW_CONFIDENCE"] } } }),
    prisma.aiAnalysis.aggregate({ where: { confidence: { not: null } }, _avg: { confidence: true } }),
    prisma.inspection.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.correctiveAction.count({ where: { dueAt: { lt: new Date() }, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
  ]);
  const compliant = predictions.find((row) => row.predictedCompliant === true)?._count._all ?? 0;
  const nonCompliant = predictions.find((row) => row.predictedCompliant === false)?._count._all ?? 0;
  const totalPredictions = compliant + nonCompliant;
  const confirmed = validations.find((row) => row.confirmed)?._count._all ?? 0;
  const discarded = validations.find((row) => !row.confirmed)?._count._all ?? 0;
  const totalValidations = confirmed + discarded;
  const compliance = percentage(compliant, totalPredictions);
  const humanAgreement = percentage(confirmed, totalValidations);
  const confidence = Math.round(Number(averageConfidence._avg.confidence ?? 0) * 1000) / 10;
  const metrics = [
    { label: "Cumplimiento detectado", value: `${compliance} %`, detail: `${totalPredictions} análisis concluyentes` },
    { label: "Coincidencia con SST", value: `${humanAgreement} %`, detail: `${totalValidations} resultados validados` },
    { label: "Confianza promedio", value: `${confidence} %`, detail: "Promedio de evaluaciones IA" },
    { label: "Pendientes de validar", value: String(pendingReviews), detail: "Requieren decisión humana" },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <section className="hero-panel rounded-3xl px-6 py-8 text-white sm:px-9 sm:py-10"><p className="eyebrow text-xs font-semibold text-violet-200">CENTRO DE CONTROL</p><h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Hola, {user.name.split(" ")[0]}.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-violet-100/75 sm:text-base">Una visión clara del cumplimiento, la precisión de la IA y las acciones que protegen a tu equipo.</p><div className="mt-6 inline-flex items-center rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-violet-100"><span className="mr-2 size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />Sistema operativo</div></section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <article className="metric-card rounded-2xl p-5" key={metric.label}><p className="text-sm font-medium text-[var(--muted)]">{metric.label}</p><p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-[var(--plum)]">{metric.value}</p><p className="mt-2 text-xs text-[var(--muted)]">{metric.detail}</p></article>)}</section>
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="surface-card rounded-2xl p-6"><div className="flex items-center justify-between gap-4"><h2 className="font-semibold text-[var(--plum)]">Cumplimiento visual</h2><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">EPP</span></div><div className="mt-6 h-3 overflow-hidden rounded-full bg-red-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${compliance}%` }} /></div><div className="mt-3 flex justify-between text-xs text-[var(--muted)]"><span>{compliant} cumplen</span><span>{nonCompliant} con hallazgos</span></div></article>
        <article className="surface-card rounded-2xl p-6"><div className="flex items-center justify-between gap-4"><h2 className="font-semibold text-[var(--plum)]">Precisión supervisada</h2><span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-strong)]">IA + SST</span></div><div className="mt-6 h-3 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-[var(--brand-strong)]" style={{ width: `${humanAgreement}%` }} /></div><div className="mt-3 flex justify-between text-xs text-[var(--muted)]"><span>{confirmed} confirmados</span><span>{discarded} descartados</span></div></article>
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-3"><article className="surface-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Inspecciones creadas hoy</p><p className="mt-2 font-mono text-2xl font-semibold text-[var(--plum)]">{inspectionsToday}</p></article><article className="surface-card rounded-2xl p-5"><p className="text-sm text-[var(--muted)]">Acciones vencidas</p><p className="mt-2 font-mono text-2xl font-semibold text-[var(--plum)]">{overdueActions}</p></article>{canReviewAi ? <a className="brand-cta rounded-2xl p-5 text-white" href="/validaciones-ia"><p className="text-sm text-violet-100/70">Cola de revisión</p><p className="mt-2 font-semibold">Abrir validaciones de IA →</p></a> : null}</section>
    </main>
  );
}
