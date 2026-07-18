import Link from "next/link";

import { LogoutButton } from "@/components/auth/logout-button";
import { requireUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <div className="min-h-screen bg-[var(--surface)]"><header className="border-b border-white/8 bg-[var(--navy)] text-white"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8"><Link className="flex items-center gap-3" href="/dashboard"><span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)] font-bold">N</span><span><span className="block font-semibold">NETMEE EPP Seguro</span><span className="block text-xs text-slate-400">Panel preventivo</span></span></Link><nav className="hidden items-center gap-5 text-sm text-slate-300 md:flex"><Link href="/dashboard">Inicio</Link><Link href="/inspecciones">Inspecciones</Link>{hasPermission(user.permissions, "inventory.view") ? <Link href="/inventario">Inventario</Link> : null}{hasPermission(user.permissions, "incident.create") ? <Link href="/novedades">Novedades</Link> : null}{hasPermission(user.permissions, "report.export") ? <Link href="/reportes">Reportes</Link> : null}{hasPermission(user.permissions, "user.manage") ? <Link href="/administracion/usuarios">Usuarios</Link> : null}{hasPermission(user.permissions, "audit.view") ? <Link href="/administracion/auditoria">Auditoría</Link> : null}</nav><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs text-slate-400">{user.roles.join(", ") || "Sin rol"}</p></div><LogoutButton /></div></div></header>{children}</div>;
}
