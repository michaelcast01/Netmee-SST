import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { buildDashboardLinks, DashboardNavLinks } from "@/components/layout/dashboard-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { requireUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await getPrisma().notification.count({ where: { userId: user.id, readAt: null } });
  const navLinks = buildDashboardLinks({
    inventoryView: hasPermission(user.permissions, "inventory.view"),
    incidentCreate: hasPermission(user.permissions, "incident.create"),
    reportExport: hasPermission(user.permissions, "report.export"),
    userManage: hasPermission(user.permissions, "user.manage"),
    auditView: hasPermission(user.permissions, "audit.view"),
  });

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="relative border-b border-white/8 bg-[var(--navy)] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link className="flex min-w-0 items-center gap-3" href="/dashboard">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand)] font-bold">N</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">NETMEE EPP Seguro</span>
              <span className="block truncate text-xs text-slate-400">Panel preventivo</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-slate-300 md:flex">
            <DashboardNavLinks className="hover:text-white" links={navLinks} />
          </nav>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <MobileNav links={navLinks} />
            <Link
              aria-label={`${unread} notificaciones sin leer`}
              className="rounded-lg border border-white/15 px-2.5 py-2 text-xs font-semibold sm:px-3"
              href="/notificaciones"
            >
              <span className="hidden sm:inline">Alertas</span>
              <span className="sm:hidden">🔔</span>
              {unread ? ` (${unread})` : ""}
            </Link>
            <div className="hidden text-right sm:block">
              <p className="max-w-[140px] truncate text-sm font-semibold lg:max-w-none">{user.name}</p>
              <p className="max-w-[140px] truncate text-xs text-slate-400 lg:max-w-none">{user.roles.join(", ") || "Sin rol"}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
