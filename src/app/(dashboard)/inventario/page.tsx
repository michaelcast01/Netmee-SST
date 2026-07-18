import type { PpeItemStatus, Prisma } from "@/generated/prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/data/pagination";
import { requirePermission } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { cleanSearch, DEFAULT_PAGE_SIZE, parsePage } from "@/lib/pagination";
import { assignPpeItemAction, returnPpeItemAction } from "./actions";

export const metadata: Metadata = { title: "Inventario de EPP" };
const statuses: PpeItemStatus[] = ["DISPONIBLE", "ASIGNADO", "MANTENIMIENTO", "DANADO", "VENCIDO", "PERDIDO", "RETIRADO"];
const ppeStatusLabels: Record<PpeItemStatus, string> = {
  DISPONIBLE: "Disponibles",
  ASIGNADO: "Asignados",
  MANTENIMIENTO: "Mantenimiento",
  DANADO: "Dañado",
  VENCIDO: "Vencido",
  PERDIDO: "Perdido",
  RETIRADO: "Retirado",
};

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; expiry?: string; page?: string }> }) {
  const user = await requirePermission("inventory.view");
  const canUpdate = hasPermission(user.permissions, "inventory.update");
  const params = await searchParams;
  const q = cleanSearch(params.q);
  const status = statuses.includes(params.status as PpeItemStatus) ? params.status as PpeItemStatus : undefined;
  const expiry = ["expired", "30", "90"].includes(params.expiry ?? "") ? params.expiry : undefined;
  const page = parsePage(params.page);
  const now = new Date(); const threshold = new Date(now); threshold.setDate(threshold.getDate() + Number(expiry || 0));
  const where: Prisma.PpeItemWhereInput = { ...(status ? { status } : {}), ...(q ? { OR: [{ qrCode: { contains: q, mode: "insensitive" } }, { serialNumber: { contains: q, mode: "insensitive" } }, { ppeType: { name: { contains: q, mode: "insensitive" } } }] } : {}), ...(expiry === "expired" ? { expiresAt: { lt: now } } : expiry ? { expiresAt: { gte: now, lte: threshold } } : {}) };
  const prisma = getPrisma();
  const expiringThreshold = new Date(now); expiringThreshold.setDate(expiringThreshold.getDate() + 30);
  const [items,total,workers,available,assigned,expiring] = await Promise.all([
    prisma.ppeItem.findMany({ where, orderBy: { createdAt: "desc" }, skip:(page-1)*DEFAULT_PAGE_SIZE, take:DEFAULT_PAGE_SIZE, include:{ppeType:true,assignments:{where:{status:"ACTIVE"},include:{worker:{select:{name:true}}}}} }),
    prisma.ppeItem.count({where}),
    canUpdate ? prisma.user.findMany({where:{active:true},orderBy:{name:"asc"},select:{id:true,name:true}}):Promise.resolve([]),
    prisma.ppeItem.count({where:{status:"DISPONIBLE"}}), prisma.ppeItem.count({where:{status:"ASIGNADO"}}), prisma.ppeItem.count({where:{expiresAt:{lte:expiringThreshold}}}),
  ]);
  return <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-[var(--brand)]">TRAZABILIDAD DE EPP</p><h1 className="mt-2 text-3xl font-semibold">Inventario</h1><p className="mt-2 text-sm text-[var(--muted)]">Asignaciones, devoluciones, vencimientos y movimientos.</p></div>{canUpdate?<Link className="rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white" href="/inventario/nuevo">Registrar elemento</Link>:null}</div><section className="mt-7 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">Disponibles</p><p className="mt-2 font-mono text-3xl font-semibold">{available}</p></article><article className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">Asignados</p><p className="mt-2 font-mono text-3xl font-semibold">{assigned}</p></article><article className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">Vencidos o próximos</p><p className="mt-2 font-mono text-3xl font-semibold">{expiring}</p></article></section><form className="mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 lg:grid-cols-[1fr_190px_190px_auto]" method="get"><input className="auth-input mt-0" defaultValue={q} name="q" placeholder="QR, serie o tipo de EPP" type="search"/><select className="auth-input mt-0" defaultValue={status??""} name="status"><option value="">Todos los estados</option>{statuses.map(s=><option key={s} value={s}>{ppeStatusLabels[s]}</option>)}</select><select className="auth-input mt-0" defaultValue={expiry??""} name="expiry"><option value="">Cualquier vencimiento</option><option value="expired">Vencidos</option><option value="30">Próximos 30 días</option><option value="90">Próximos 90 días</option></select><button className="rounded-xl bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white">Buscar</button></form><div className="mt-5 space-y-3">{items.map(item=>{const assignment=item.assignments[0];return <article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm" key={item.id}><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.ppeType.name}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{ppeStatusLabels[item.status]}</span></div><p className="mt-2 font-mono text-xs text-[var(--muted)]">{item.qrCode}</p><p className="mt-1 text-xs text-[var(--muted)]">Serie: {item.serialNumber||"Sin serie"} · Talla: {item.size||"N/A"} · Vence: {item.expiresAt?.toLocaleDateString("es-CO")||"Sin fecha"}</p>{assignment?<p className="mt-2 text-sm">Asignado a <strong>{assignment.worker.name}</strong></p>:null}</div>{canUpdate&&item.status==="DISPONIBLE"?<form action={assignPpeItemAction} className="flex flex-col gap-2 sm:flex-row"><input name="ppeItemId" type="hidden" value={item.id}/><select className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs" name="workerId" required><option value="">Asignar a…</option>{workers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><input className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs" name="notes" placeholder="Observación"/><button className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white">Entregar</button></form>:null}{canUpdate&&assignment?<form action={returnPpeItemAction}><input name="assignmentId" type="hidden" value={assignment.id}/><button className="rounded-lg border border-[var(--line)] px-4 py-2 text-xs font-semibold">Registrar devolución</button></form>:null}</div></article>})}{!items.length?<div className="rounded-2xl border border-dashed border-[var(--line)] p-10 text-center text-sm text-[var(--muted)]">No hay resultados.</div>:null}<div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white"><Pagination page={page} pageSize={DEFAULT_PAGE_SIZE} params={{q,status,expiry}} pathname="/inventario" total={total}/></div></div></main>;
}
