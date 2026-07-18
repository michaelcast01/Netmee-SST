import type { Prisma } from "@/generated/prisma/client";
import type { Metadata } from "next";
import { Pagination } from "@/components/data/pagination";
import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";
import { auditLabel } from "@/lib/display-labels";
import { cleanSearch, DEFAULT_PAGE_SIZE, parsePage } from "@/lib/pagination";
export const metadata: Metadata = { title: "Auditoría" };
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; entity?: string; page?: string }>;
}) {
  await requirePermission("audit.view");
  const p = await searchParams;
  const q = cleanSearch(p.q);
  const entity = cleanSearch(p.entity, 50);
  const page = parsePage(p.page);
  const where: Prisma.AuditLogWhereInput = {
    ...(entity
      ? { entityType: { contains: entity, mode: "insensitive" } }
      : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" } },
            { entityId: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const db = getPrisma();
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * DEFAULT_PAGE_SIZE,
      take: DEFAULT_PAGE_SIZE,
    }),
    db.auditLog.count({ where }),
  ]);
  const actorIds = [
    ...new Set(logs.flatMap((l) => (l.actorId ? [l.actorId] : []))),
  ];
  const actors = await db.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const names = new Map(actors.map((a) => [a.id, a.name]));
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-sm font-semibold text-[var(--brand)]">TRAZABILIDAD</p>
      <h1 className="mt-2 text-3xl font-semibold">Auditoría</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Registro paginado de operaciones sensibles.
      </p>
      <form
        className="mt-6 grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 sm:grid-cols-[1fr_220px_auto]"
        method="get"
      >
        <input
          className="auth-input mt-0"
          defaultValue={q}
          name="q"
          placeholder="Acción o identificador"
          type="search"
        />
        <input
          className="auth-input mt-0"
          defaultValue={entity}
          name="entity"
          placeholder="Tipo de entidad"
        />
        <button className="rounded-xl bg-[var(--navy)] px-5 py-3 text-sm font-semibold text-white">
          Buscar
        </button>
      </form>
      <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="divide-y divide-[var(--line)] md:hidden">
          {logs.map((log) => (
            <article className="p-4" key={log.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {log.actorId
                    ? (names.get(log.actorId) ?? "Usuario eliminado")
                    : "Sistema"}
                </p>
                <time
                  className="text-xs text-[var(--muted)]"
                  dateTime={log.createdAt.toISOString()}
                >
                  {log.createdAt.toLocaleString("es-CO")}
                </time>
              </div>
              <p className="mt-3 text-sm">{auditLabel(log.action)}</p>
              <p className="mt-2 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-[var(--muted)]">
                {auditLabel(log.entityType)}: {log.entityId}
              </p>
            </article>
          ))}
          {!logs.length ? (
            <p className="p-8 text-center text-sm text-[var(--muted)]">
              No hay resultados.
            </p>
          ) : null}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-slate-50 text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4">Fecha</th>
                <th className="px-5 py-4">Actor</th>
                <th className="px-5 py-4">Acción</th>
                <th className="px-5 py-4">Entidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-4 font-mono text-xs">
                    {l.createdAt.toLocaleString("es-CO")}
                  </td>
                  <td className="px-5 py-4">
                    {l.actorId
                      ? (names.get(l.actorId) ?? "Usuario eliminado")
                      : "Sistema"}
                  </td>
                  <td className="px-5 py-4 text-xs">{auditLabel(l.action)}</td>
                  <td className="px-5 py-4 font-mono text-xs">
                    {auditLabel(l.entityType)}: {l.entityId}
                  </td>
                </tr>
              ))}
              {!logs.length ? (
                <tr>
                  <td
                    className="px-5 py-10 text-center text-[var(--muted)]"
                    colSpan={4}
                  >
                    No hay resultados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={DEFAULT_PAGE_SIZE}
          params={{ q, entity }}
          pathname="/administracion/auditoria"
          total={total}
        />
      </div>
    </main>
  );
}
