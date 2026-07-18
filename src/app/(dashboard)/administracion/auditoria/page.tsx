import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Auditoría" };

export default async function AuditPage() {
  await requirePermission("audit.view");
  const logs = await getPrisma().auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const actorIds = [...new Set(logs.flatMap((log) => log.actorId ? [log.actorId] : []))];
  const actors = await getPrisma().user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const actorNames = new Map(actors.map((actor) => [actor.id, actor.name]));
  return <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8"><p className="text-sm font-semibold text-[var(--brand)]">TRAZABILIDAD</p><h1 className="mt-2 text-3xl font-semibold">Auditoría</h1><p className="mt-2 text-sm text-[var(--muted)]">Últimas 200 operaciones sensibles registradas por el sistema.</p><div className="mt-7 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[var(--line)] bg-slate-50 text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Fecha</th><th className="px-5 py-4">Actor</th><th className="px-5 py-4">Acción</th><th className="px-5 py-4">Entidad</th></tr></thead><tbody className="divide-y divide-[var(--line)]">{logs.map((log) => <tr key={log.id}><td className="px-5 py-4 font-mono text-xs">{log.createdAt.toLocaleString("es-CO")}</td><td className="px-5 py-4">{log.actorId ? actorNames.get(log.actorId) ?? "Usuario eliminado" : "Sistema"}</td><td className="px-5 py-4 font-mono text-xs">{log.action}</td><td className="px-5 py-4"><span className="font-mono text-xs">{log.entityType}:{log.entityId}</span></td></tr>)}</tbody></table></div></div></main>;
}
