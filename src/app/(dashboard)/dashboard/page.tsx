import type { Metadata } from "next";

import { requireUser } from "@/lib/auth/dal";
import { modules } from "@/modules/catalog";

export const metadata: Metadata = { title: "Panel" };

const metrics = [
  { label: "Cumplimiento EPP", value: "94,8 %", detail: "+2,4 % este mes" },
  { label: "Inspecciones hoy", value: "38", detail: "5 pendientes" },
  { label: "Alertas activas", value: "7", detail: "2 de alta prioridad" },
  { label: "Acciones vencidas", value: "3", detail: "Requieren atención" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  return <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8"><section><p className="text-sm font-semibold text-[var(--brand)]">PANEL OPERATIVO</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Hola, {user.name.split(" ")[0]}.</h1><p className="mt-3 max-w-2xl text-[var(--muted)]">Monitorea inspecciones, inventario, alertas y acciones correctivas desde un solo lugar.</p></section><section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm" key={metric.label}><p className="text-sm text-[var(--muted)]">{metric.label}</p><p className="mt-3 font-mono text-3xl font-semibold">{metric.value}</p><p className="mt-2 text-xs text-[var(--muted)]">{metric.detail}</p></article>)}</section><section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Capacidades del sistema</h2><p className="mt-1 text-sm text-[var(--muted)]">La seguridad de acceso ya está activa; los módulos continuarán por el orden definido.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{modules.map((module) => <article className="rounded-xl border border-[var(--line)] p-4" key={module.slug}><h3 className="text-sm font-semibold">{module.name}</h3><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{module.description}</p></article>)}</div></section></main>;
}
