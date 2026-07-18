import type { Metadata } from "next";
import Link from "next/link";

import { requirePermission } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { assignPpeItemAction, returnPpeItemAction } from "./actions";

export const metadata: Metadata = { title: "Inventario de EPP" };

async function getExpiringItemCount() {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + 30);
  return getPrisma().ppeItem.count({ where: { expiresAt: { lte: threshold } } });
}

export default async function InventoryPage() {
  const user = await requirePermission("inventory.view");
  const canUpdate = hasPermission(user.permissions, "inventory.update");
  const prisma = getPrisma();
  const [items, workers, expiring] = await Promise.all([
    prisma.ppeItem.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { ppeType: true, assignments: { where: { status: "ACTIVE" }, include: { worker: { select: { name: true } } } } } }),
    canUpdate ? prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
    getExpiringItemCount(),
  ]);
  const counts = { available: items.filter((item) => item.status === "AVAILABLE").length, assigned: items.filter((item) => item.status === "ASSIGNED").length, expiring };
  return <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-[var(--brand)]">TRAZABILIDAD DE EPP</p><h1 className="mt-2 text-3xl font-semibold">Inventario</h1><p className="mt-2 text-sm text-[var(--muted)]">Asignaciones, devoluciones, vencimientos y movimientos.</p></div>{canUpdate ? <Link className="rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white" href="/inventario/nuevo">Registrar elemento</Link> : null}</div><section className="mt-7 grid gap-4 sm:grid-cols-3"><article className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">Disponibles</p><p className="mt-2 font-mono text-3xl font-semibold">{counts.available}</p></article><article className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">Asignados</p><p className="mt-2 font-mono text-3xl font-semibold">{counts.assigned}</p></article><article className="rounded-2xl border border-[var(--line)] bg-white p-5"><p className="text-sm text-[var(--muted)]">Vencidos o próximos</p><p className="mt-2 font-mono text-3xl font-semibold">{counts.expiring}</p></article></section><div className="mt-6 space-y-3">{items.map((item) => { const assignment = item.assignments[0]; return <article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm" key={item.id}><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{item.ppeType.name}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{item.status}</span></div><p className="mt-2 font-mono text-xs text-[var(--muted)]">{item.qrCode}</p><p className="mt-1 text-xs text-[var(--muted)]">Serie: {item.serialNumber || "Sin serie"} · Talla: {item.size || "N/A"} · Vence: {item.expiresAt?.toLocaleDateString("es-CO") || "Sin fecha"}</p>{assignment ? <p className="mt-2 text-sm">Asignado a <strong>{assignment.worker.name}</strong></p> : null}</div>{canUpdate && item.status === "AVAILABLE" ? <form action={assignPpeItemAction} className="flex flex-col gap-2 sm:flex-row"><input name="ppeItemId" type="hidden" value={item.id} /><select className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs" name="workerId" required><option value="">Asignar a…</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select><input className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs" maxLength={500} name="notes" placeholder="Observación" /><button className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white" type="submit">Entregar</button></form> : null}{canUpdate && assignment ? <form action={returnPpeItemAction}><input name="assignmentId" type="hidden" value={assignment.id} /><button className="rounded-lg border border-[var(--line)] px-4 py-2 text-xs font-semibold" type="submit">Registrar devolución</button></form> : null}</div></article>; })}{items.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--line)] p-10 text-center text-sm text-[var(--muted)]">No hay elementos registrados.</div> : null}</div></main>;
}
