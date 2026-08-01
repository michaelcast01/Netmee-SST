import type { InspectionStatus, Prisma } from "@/generated/prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { Pagination } from "@/components/data/pagination";
import { StatusBadge } from "@/components/inspections/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        action={hasPermission(user.permissions, "inspection.create") ? <Link className={buttonVariants({ className: "brand-cta h-10 px-5 text-white", size: "lg" })} href="/inspecciones/nueva">Nueva inspección</Link> : null}
        description="Verificaciones previas y trazabilidad por actividad."
        eyebrow="CONTROL PREVENTIVO"
        icon={ClipboardCheck}
        title="Inspecciones"
      />

      <form className="surface-card mt-6 grid gap-3 rounded-2xl p-4 ring-1 ring-foreground/10 sm:grid-cols-2 lg:grid-cols-[1fr_220px_auto]" method="get">
        <Input className="h-11 sm:col-span-2 lg:col-span-1" defaultValue={q} name="q" placeholder="Código, trabajador o actividad" type="search" />
        <select className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={status ?? ""} name="status">
          <option value="">Todos los estados</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {inspectionStatusLabels[value]}
            </option>
          ))}
        </select>
        <Button className="brand-cta h-11 px-5 text-white sm:col-span-2 lg:col-span-1" size="lg" type="submit">
          Buscar
        </Button>
      </form>

      <div className="mt-5 space-y-3 md:hidden">
        {inspections.map((inspection) => (
          <Card className="surface-card rounded-2xl p-4" key={inspection.id}>
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
            <Link
              className={buttonVariants({ className: "mt-4 h-9 w-full border-[var(--line)] bg-[var(--brand-soft)] text-[var(--brand-strong)] hover:border-[var(--brand)]", size: "sm", variant: "outline" })}
              href={`/inspecciones/${inspection.id}`}
            >
              {inspection.workerId === user.id && inspection.status === "BORRADOR" ? "Editar borrador" : "Ver detalle"}
            </Link>
          </Card>
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
                <th className="px-5 py-4 text-right">Acción</th>
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
                  <td className="px-5 py-4 text-right">
                    <Link
                      className={buttonVariants({ className: "h-8 border-[var(--line)] bg-[var(--brand-soft)] text-[var(--brand-strong)] hover:border-[var(--brand)]", size: "sm", variant: "outline" })}
                      href={`/inspecciones/${inspection.id}`}
                    >
                      {inspection.workerId === user.id && inspection.status === "BORRADOR" ? "Editar borrador" : "Ver detalle"}
                    </Link>
                  </td>
                </tr>
              ))}
              {!inspections.length ? (
                <tr>
                  <td className="px-5 py-10 text-center text-[var(--muted)]" colSpan={6}>
                    No hay resultados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface-card mt-3 overflow-hidden rounded-2xl md:mt-0 md:border-0 md:bg-transparent md:shadow-none">
        <Pagination page={page} pageSize={DEFAULT_PAGE_SIZE} params={{ q, status }} pathname="/inspecciones" total={total} />
      </div>
    </main>
  );
}
