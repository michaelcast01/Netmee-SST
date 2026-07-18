import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";
import { syncNotificationsForUser } from "@/modules/notifications/service";
import { markAllNotificationsRead, markNotificationRead } from "./actions";
export const metadata: Metadata = { title: "Notificaciones" };
const labels = {
  PPE_EXPIRING: "Vencimiento EPP",
  INSPECTION_PENDING: "Revisión",
  CORRECTIVE_ACTION_OVERDUE: "Acción vencida",
  CRITICAL_FINDING: "Hallazgo crítico",
} as const;
export default async function NotificationsPage() {
  const user = await requireUser();
  await syncNotificationsForUser(user);
  const notifications = await getPrisma().notification.findMany({
    where: { userId: user.id },
    orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[var(--brand)]">
            CENTRO DE ALERTAS
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Notificaciones</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Vencimientos, revisiones y hallazgos que requieren atención.
          </p>
        </div>
        <form action={markAllNotificationsRead}>
          <button className="w-full rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold sm:w-auto">
            Marcar todas como leídas
          </button>
        </form>
      </div>
      <section className="mt-7 space-y-3">
        {notifications.map((n) => (
          <article
            className={`rounded-2xl border p-5 ${n.readAt ? "border-[var(--line)] bg-white" : "border-violet-200 bg-violet-50"}`}
            key={n.id}
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <span className="text-xs font-semibold uppercase text-[var(--brand)]">
                  {labels[n.type]}
                </span>
                <h2 className="mt-1 font-semibold">{n.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{n.message}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {n.createdAt.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className="rounded-lg bg-[var(--navy)] px-3 py-2 text-xs font-semibold text-white"
                  href={n.href}
                >
                  Ver
                </Link>
                {!n.readAt ? (
                  <form action={markNotificationRead}>
                    <input name="id" type="hidden" value={n.id} />
                    <button className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold">
                      Leída
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {!notifications.length ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] p-10 text-center text-sm text-[var(--muted)]">
            No tienes alertas activas.
          </div>
        ) : null}
      </section>
    </main>
  );
}
