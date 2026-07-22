import type { InspectionStatus, Prisma } from "@/generated/prisma/client";
import type { Metadata } from "next";
import Link from "next/link";

import { Pagination } from "@/components/data/pagination";
import { StatusBadge } from "@/components/inspections/status-badge";
import { requireUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { cleanSearch, DEFAULT_PAGE_SIZE, parsePage } from "@/lib/pagination";
import { inspectionStatuses, inspectionStatusLabels } from "@/modules/inspections";

export const metadata: Metadata = { title: "Inspecciones" };
const statuses = inspectionStatuses;

export default async function InspectionsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = cleanSearch(params.q);
  const status = statuses.includes(params.status as InspectionStatus) ? (params.status as InspectionStatus) : undefined;
  const page = parsePage(params.page);
  const canReview = hasPermission(user.permissions, "inspection.review");
  const where: Prisma.InspectionWhereInput = {
    ...(canReview ? {} : { workerId: user.id }),
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { worker: { name: { contains: q, mode: "insensitive" } } }, { activity: { name: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const prisma = getPrisma();
  const [inspections, total] = await Promise.all([
    prisma.inspection.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * DEFAULT_PAGE_SIZE, take: DEFAULT_PAGE_SIZE, include: { worker: { select: { name: true } }, activity: { select: { name: true } }, _count: { select: { items: true } } } }),
    prisma.inspection.count({ where }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow text-xs font-semibold text-[var(--brand)]">CONTROL PREVENTIVO</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Inspecciones</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Verificaciones previas y trazabilidad por actividad.</p>
        </div>
        {hasPermission(user.permissions, "inspection.create") ? (
          <Link className="brand-cta rounded-xl px-5 py-3 text-center text-sm font-semibold text-white" href="/inspecciones/nueva">
            Nueva inspección
          </Link>
        ) : null}
      </div>

      <form className="surface-card mt-6 grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-[1fr_220px_auto]" method="get">
        <input className="auth-input mt-0 sm:col-span-2 lg:col-span-1" defaultValue={q} name="q" placeholder="Código, trabajador o actividad" type="search" />
        <select className="auth-input mt-0" defaultValue={status ?? ""} name="status">
          <option value="">Todos los estados</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {inspectionStatusLabels[value]}
            </option>
          ))}
        </select>
        <button className="brand-cta rounded-xl px-5 py-3 text-sm font-semibold text-white sm:col-span-2 lg:col-span-1" type="submit">
          Buscar
        </button>
      </form>

      <div className="mt-5 space-y-3 md:hidden">
        {inspections.map((inspection) => (
          <article className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm" key={inspection.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link className="font-mono text-xs font-semibold text-[var(--brand)]" href={`/inspecciones/${inspection.id}`}>
                  {inspection.code}
                </Link>
                <p className="mt-2 font-semibold">{inspection.activity.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{inspection.worker.name}</p>
              </div>
              <StatusBadge status={inspection.status} />
            </div>
            <p className="mt-3 text-xs text-[var(--muted)]">
              {inspection._count.items} elementos · {inspection.createdAt.toLocaleDateString("es-CO")}
            </p>
          </article>
        ))}
        {!inspections.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] p-10 text-center text-sm text-[var(--muted)]">No hay resultados.</div>
        ) : null}
      </div>

      <div className="surface-card mt-5 hidden overflow-hidden rounded-2xl md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-violet-50/70 text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4">Código</th>
                <th className="px-5 py-4">Actividad</th>
                <th className="px-5 py-4">Trabajador</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-5 py-4">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {inspections.map((inspection) => (
                <tr className="transition-colors hover:bg-violet-50/60" key={inspection.id}>
                  <td className="px-5 py-4">
                    <Link className="font-mono text-xs font-semibold text-[var(--brand)]" href={`/inspecciones/${inspection.id}`}>
                      {inspection.code}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{inspection.activity.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{inspection._count.items} elementos</p>
                  </td>
                  <td className="px-5 py-4">{inspection.worker.name}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={inspection.status} />
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--muted)]">{inspection.createdAt.toLocaleDateString("es-CO")}</td>
                </tr>
              ))}
              {!inspections.length ? (
                <tr>
                  <td className="px-5 py-10 text-center text-[var(--muted)]" colSpan={5}>
                    No hay resultados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-white md:mt-0 md:border-0 md:bg-transparent">
        <Pagination page={page} pageSize={DEFAULT_PAGE_SIZE} params={{ q, status }} pathname="/inspecciones" total={total} />
      </div>
    </main>
  );
}
