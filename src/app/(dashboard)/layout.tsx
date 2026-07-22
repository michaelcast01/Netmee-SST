import Link from "next/link";

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
  const navigation = (
    <>
      <Link href="/dashboard">Inicio</Link>
      <Link href="/inspecciones">Inspecciones</Link>
      {hasPermission(user.permissions, "inspection.review") ? (
        <Link href="/validaciones-ia">Validaciones IA</Link>
      ) : null}
      {hasPermission(user.permissions, "inventory.view") ? (
        <Link href="/inventario">Inventario</Link>
      ) : null}
      {hasPermission(user.permissions, "incident.create") ? (
        <Link href="/novedades">Novedades</Link>
      ) : null}
      {hasPermission(user.permissions, "report.export") ? (
        <Link href="/reportes">Reportes</Link>
      ) : null}
      {hasPermission(user.permissions, "user.manage") ? (
        <Link href="/administracion/usuarios">Usuarios</Link>
      ) : null}
      {hasPermission(user.permissions, "audit.view") ? (
        <Link href="/administracion/auditoria">Auditoría</Link>
      ) : null}
    </>
  );
  return (
    <div className="app-shell min-h-screen">
      <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
      <header className="brand-header sticky top-0 z-40 border-b border-white/10 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <Link className="flex items-center gap-2 sm:gap-3" href="/dashboard">
            <span className="brand-mark grid size-9 shrink-0 place-items-center rounded-xl font-bold sm:size-10">
              N
            </span>
            <span className="hidden xs:block sm:block">
              <span className="block text-sm font-semibold sm:text-base">
                NETMEE EPP Seguro
              </span>
              <span className="block text-xs text-violet-200/65">
                Centro de seguridad
              </span>
            </span>
          </Link>
          <nav className="brand-nav hidden items-center gap-1 text-sm text-violet-100/75 lg:flex">
            {navigation}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              aria-label={`${unread} notificaciones sin leer`}
              className="glass-control rounded-xl px-2.5 py-2 text-xs font-semibold sm:px-3"
              href="/notificaciones"
            >
              Alertas{unread ? ` (${unread})` : ""}
            </Link>
            <div className="hidden max-w-44 text-right md:block">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-violet-200/60">
                {user.roles.map(displayLabel).join(", ") || "Sin rol"}
              </p>
            </div>
            <LogoutButton />
          </div>
          <details className="w-full border-t border-white/10 pt-2 lg:hidden">
            <summary className="cursor-pointer list-none rounded-lg py-2 text-sm font-semibold text-slate-200">
              Menú de navegación
            </summary>
            <nav className="brand-nav grid grid-cols-2 gap-2 pb-2 pt-1 text-sm text-violet-100/80 sm:grid-cols-4 [&_a]:bg-white/5 [&_a]:px-3 [&_a]:py-2.5">
              {navigation}
            </nav>
          </details>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>{children}</div>
    </div>
  );
}
