import type { PpeItemStatus, Prisma } from "@/generated/prisma/client";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, PackageSearch, ShieldCheck } from "lucide-react";

import { Pagination } from "@/components/data/pagination";
import { PpeImageUploader } from "@/components/inventory/ppe-image-uploader";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashMessage } from "@/components/ui/flash-message";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { cleanSearch, DEFAULT_PAGE_SIZE, parsePage } from "@/lib/pagination";
import { ppeStatusLabels, ppeStatuses } from "@/modules/inventory/labels";
import { assignPpeItemAction, returnPpeItemAction } from "./actions";

export const metadata: Metadata = { title: "Inventario de EPP" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; expiry?: string; page?: string; created?: string }>;
}) {
  const user = await requirePermission("inventory.view");
  const canUpdate = hasPermission(user.permissions, "inventory.update");
  const params = await searchParams;
  const q = cleanSearch(params.q);
  const status = ppeStatuses.includes(params.status as PpeItemStatus)
    ? params.status as PpeItemStatus
    : undefined;
  const expiry = ["expired", "30", "90"].includes(params.expiry ?? "") ? params.expiry : undefined;
  const page = parsePage(params.page);
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + Number(expiry || 0));
  const where: Prisma.PpeItemWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? {
      OR: [
        { qrCode: { contains: q, mode: "insensitive" } },
        { serialNumber: { contains: q, mode: "insensitive" } },
        { ppeType: { name: { contains: q, mode: "insensitive" } } },
      ],
    } : {}),
    ...(expiry === "expired"
      ? { expiresAt: { lt: now } }
      : expiry
        ? { expiresAt: { gte: now, lte: threshold } }
        : {}),
  };
  const prisma = getPrisma();
  const expiringThreshold = new Date(now);
  expiringThreshold.setDate(expiringThreshold.getDate() + 30);
  const [items, total, workers, available, assigned, expiring, withoutImage] = await Promise.all([
    prisma.ppeItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * DEFAULT_PAGE_SIZE,
      take: DEFAULT_PAGE_SIZE,
      include: {
        ppeType: true,
        assignments: {
          where: { status: "ACTIVE" },
          include: { worker: { select: { name: true } } },
        },
      },
    }),
    prisma.ppeItem.count({ where }),
    canUpdate
      ? prisma.user.findMany({
          where: {
            active: true,
            roles: { some: { role: { code: "TECHNICIAN" } } },
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    prisma.ppeItem.count({ where: { status: "DISPONIBLE" } }),
    prisma.ppeItem.count({ where: { status: "ASIGNADO" } }),
    prisma.ppeItem.count({
      where: {
        status: { in: ["DISPONIBLE", "ASIGNADO"] },
        expiresAt: { lte: expiringThreshold },
      },
    }),
    prisma.ppeItem.count({ where: { imageStoragePath: null } }),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        action={canUpdate ? <Link className={buttonVariants({ className: "brand-cta h-10 px-5 text-white", size: "lg" })} href="/inventario/nuevo">Registrar elemento</Link> : null}
        description="Fotografías, asignaciones, devoluciones, vencimientos y movimientos de cada EPP."
        eyebrow="TRAZABILIDAD DE EPP"
        icon={PackageSearch}
        title="Inventario"
      />
      {params.created ? <FlashMessage success="Elemento y fotografía registrados correctamente." /> : null}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Disponibles", value: available },
          { label: "Asignados", value: assigned },
          { label: "Vencidos o próximos", value: expiring },
          { label: "Sin fotografía", value: withoutImage },
        ].map((metric) => (
          <article className="metric-card rounded-2xl p-5" key={metric.label}>
            <p className="text-sm text-[var(--muted)]">{metric.label}</p>
            <p className="mt-2 font-mono text-3xl font-semibold">{metric.value}</p>
          </article>
        ))}
      </section>

      <form className="surface-card mt-5 grid gap-3 rounded-2xl p-4 ring-1 ring-foreground/10 lg:grid-cols-[1fr_190px_190px_auto]" method="get">
        <Input aria-label="Buscar por QR, serie o tipo de EPP" className="h-11" defaultValue={q} name="q" placeholder="QR, serie o tipo de EPP" type="search" />
        <select aria-label="Filtrar por estado" className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={status ?? ""} name="status">
          <option value="">Todos los estados</option>
          {ppeStatuses.map((itemStatus) => <option key={itemStatus} value={itemStatus}>{ppeStatusLabels[itemStatus]}</option>)}
        </select>
        <select aria-label="Filtrar por vencimiento" className="h-11 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" defaultValue={expiry ?? ""} name="expiry">
          <option value="">Cualquier vencimiento</option>
          <option value="expired">Vencidos</option>
          <option value="30">Próximos 30 días</option>
          <option value="90">Próximos 90 días</option>
        </select>
        <Button className="brand-cta h-11 px-5 text-white" size="lg" type="submit">Buscar</Button>
      </form>

      <div className="mt-5 space-y-4">
        {items.map((item) => {
          const assignment = item.assignments[0];
          return (
            <article className="surface-card overflow-hidden rounded-2xl" key={item.id}>
              <div className="grid md:grid-cols-[220px_1fr]">
                <div className="relative min-h-52 bg-slate-100">
                  {item.imageStoragePath ? (
                    <Image
                      alt={`Fotografía de ${item.ppeType.name}`}
                      className="object-cover"
                      fill
                      sizes="(max-width: 768px) 100vw, 220px"
                      src={`/api/v1/inventory/items/${item.id}/image`}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full min-h-52 flex-col items-center justify-center gap-2 text-[var(--muted)]">
                      <ImageOff aria-hidden className="size-8" />
                      <span className="text-xs font-semibold">Sin fotografía</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{item.ppeType.name}</h2>
                        <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-strong)]">{ppeStatusLabels[item.status]}</span>
                      </div>
                      <p className="mt-2 font-mono text-xs text-[var(--muted)]">{item.qrCode}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Serie: {item.serialNumber || "Sin serie"} · Talla: {item.size || "N/A"} · Vence: {item.expiresAt?.toLocaleDateString("es-CO") || "Sin fecha"}
                      </p>
                      {assignment ? <p className="mt-2 text-sm">Asignado a <strong>{assignment.worker.name}</strong></p> : null}
                    </div>
                    {canUpdate && item.status === "DISPONIBLE" ? (
                      <form action={assignPpeItemAction} className="flex flex-col gap-2">
                        <input name="ppeItemId" type="hidden" value={item.id} />
                        <select aria-label="Técnico que recibirá el elemento" className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs" name="workerId" required>
                          <option value="">Asignar a técnico…</option>
                          {workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
                        </select>
                        <input aria-label="Observación de entrega" className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs" name="notes" placeholder="Observación" />
                        <Button className="brand-cta h-8 px-3 text-xs text-white" size="sm" type="submit">Entregar</Button>
                      </form>
                    ) : null}
                    {canUpdate && assignment ? (
                      <form action={returnPpeItemAction}>
                        <input name="assignmentId" type="hidden" value={assignment.id} />
                        <Button className="h-8 border-[var(--line)] px-4 text-xs" size="sm" type="submit" variant="outline">Registrar devolución</Button>
                      </form>
                    ) : null}
                  </div>
                  {canUpdate ? <PpeImageUploader hasImage={Boolean(item.imageStoragePath)} itemId={item.id} /> : null}
                </div>
              </div>
            </article>
          );
        })}
        {!items.length ? <EmptyState description="Ajusta los filtros o registra un nuevo elemento con fotografía para comenzar su trazabilidad." icon={ShieldCheck} title="No encontramos elementos" /> : null}
        <div className="surface-card overflow-hidden rounded-2xl">
          <Pagination page={page} pageSize={DEFAULT_PAGE_SIZE} params={{ q, status, expiry }} pathname="/inventario" total={total} />
        </div>
      </div>
    </main>
  );
}
