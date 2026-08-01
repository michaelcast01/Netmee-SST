import type { Metadata } from "next";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        action={<form action={markAllNotificationsRead}><Button className="h-10 border-[var(--line)] bg-[var(--card)]" size="lg" type="submit" variant="outline">Marcar todas como leídas</Button></form>}
        description="Vencimientos, revisiones y hallazgos que requieren atención."
        eyebrow="CENTRO DE ALERTAS"
        icon={BellRing}
        title="Notificaciones"
      />
      <section className="mt-7 space-y-3">
        {notifications.map((n) => (
          <article
            className={`surface-card rounded-2xl p-5 ${n.readAt ? "" : "border-violet-200 bg-violet-50/70"}`}
            key={n.id}
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <Badge className="bg-[var(--brand-soft)] text-[var(--brand-strong)]" variant="secondary">
                  {labels[n.type]}
                </Badge>
                <h2 className="mt-1 font-semibold">{n.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{n.message}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {n.createdAt.toLocaleString("es-CO")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  className={buttonVariants({ className: "h-8 px-3 text-xs", size: "sm" })}
                  href={n.href}
                >
                  Ver
                </Link>
                {!n.readAt ? (
                  <form action={markNotificationRead}>
                    <input name="id" type="hidden" value={n.id} />
                    <Button className="h-8 border-[var(--line)] px-3 text-xs" size="sm" type="submit" variant="outline">
                      Leída
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {!notifications.length ? (
          <div className="surface-card rounded-2xl border-dashed p-10 text-center text-sm text-[var(--muted)]">
            No tienes alertas activas.
          </div>
        ) : null}
      </section>
    </main>
  );
}
