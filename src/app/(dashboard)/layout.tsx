import Link from "next/link";

import { ActiveDashboardNav } from "@/components/layout/active-dashboard-nav";
import { buildDashboardLinks } from "@/components/layout/dashboard-nav";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { displayLabel } from "@/lib/display-labels";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unread = await getPrisma().notification.count({
    where: { userId: user.id, readAt: null },
  });
  const navigation = buildDashboardLinks({
    inspectionReview: hasPermission(user.permissions, "inspection.review"),
    inventoryView: hasPermission(user.permissions, "inventory.view"),
    incidentCreate: hasPermission(user.permissions, "incident.create"),
    reportExport: hasPermission(user.permissions, "report.export"),
    userManage: hasPermission(user.permissions, "user.manage"),
    auditView: hasPermission(user.permissions, "audit.view"),
  });
  return (
    <div className="app-shell min-h-screen">
      <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
      <header className="brand-header sticky top-0 z-40 border-b border-white/10 text-white">
        <div className="dashboard-header-shell mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:grid lg:gap-5 lg:px-8">
          <Link className="flex items-center gap-2 sm:gap-3" href="/dashboard">
            <span className="brand-mark grid size-10 shrink-0 place-items-center rounded-[0.9rem] text-lg font-bold">
              N
            </span>
            <span className="block">
              <span className="block text-sm font-bold tracking-[-0.02em] sm:text-base">
                NETMEE EPP Seguro
              </span>
              <span className="block text-xs text-violet-200/65">
                Centro de seguridad
              </span>
            </span>
          </Link>
          <nav className="brand-nav hidden items-center justify-self-center gap-0.5 text-[0.8rem] font-medium text-violet-100/75 xl:flex">
            <ActiveDashboardNav links={navigation} />
          </nav>
          <div className="flex items-center justify-self-end gap-1.5 sm:gap-2">
            <ThemeToggle />
            <Link
              aria-label={`${unread} notificaciones sin leer`}
              className="glass-control header-alert rounded-xl px-2.5 py-2 text-xs font-semibold sm:px-3"
              href="/notificaciones"
            >
              Alertas{unread ? ` (${unread})` : ""}
            </Link>
            <div className="header-user hidden text-right md:block">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-violet-200/60">
                {user.roles.map(displayLabel).join(", ") || "Sin rol"}
              </p>
            </div>
            <LogoutButton />
          </div>
          <details className="dashboard-mobile-menu border-t border-white/10 pt-3 xl:hidden">
            <summary>
              Menú de navegación
            </summary>
            <nav className="brand-nav grid grid-cols-2 gap-2 pb-1 pt-2 text-sm text-violet-100/80 sm:grid-cols-4 [&_a]:bg-white/5 [&_a]:px-3 [&_a]:py-2.5">
              <ActiveDashboardNav links={navigation} mobile />
            </nav>
          </details>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>{children}</div>
    </div>
  );
}
