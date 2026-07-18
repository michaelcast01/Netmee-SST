import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/inspections/status-badge";
import { requireUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Inspecciones" };

export default async function InspectionsPage() {
  const user = await requireUser();
  const canReview = hasPermission(user.permissions, "inspection.review");
  const inspections = await getPrisma().inspection.findMany({
    where: canReview ? undefined : { workerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { worker: { select: { name: true } }, activity: { select: { name: true } }, _count: { select: { items: true } } },
  });
  return <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-[var(--brand)]">CONTROL PREVENTIVO</p><h1 className="mt-2 text-3xl font-semibold">Inspecciones</h1><p className="mt-2 text-sm text-[var(--muted)]">Verificaciones previas y trazabilidad por actividad.</p></div>{hasPermission(user.permissions, "inspection.create") ? <Link className="rounded-xl bg-[var(--brand)] px-5 py-3 text-center text-sm font-semibold text-white" href="/inspecciones/nueva">Nueva inspección</Link> : null}</div><div className="mt-7 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[var(--line)] bg-slate-50 text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Código</th><th className="px-5 py-4">Actividad</th><th className="px-5 py-4">Trabajador</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Fecha</th></tr></thead><tbody className="divide-y divide-[var(--line)]">{inspections.map((inspection) => <tr className="hover:bg-slate-50" key={inspection.id}><td className="px-5 py-4"><Link className="font-mono text-xs font-semibold text-[var(--brand)]" href={`/inspecciones/${inspection.id}`}>{inspection.code}</Link></td><td className="px-5 py-4"><p className="font-semibold">{inspection.activity.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{inspection._count.items} elementos</p></td><td className="px-5 py-4">{inspection.worker.name}</td><td className="px-5 py-4"><StatusBadge status={inspection.status} /></td><td className="px-5 py-4 text-xs text-[var(--muted)]">{inspection.createdAt.toLocaleDateString("es-CO")}</td></tr>)}{inspections.length === 0 ? <tr><td className="px-5 py-10 text-center text-[var(--muted)]" colSpan={5}>No hay inspecciones registradas.</td></tr> : null}</tbody></table></div></div></main>;
}
