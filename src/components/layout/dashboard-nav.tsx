import Link from "next/link";

export type NavLink = { href: string; label: string };

export function DashboardNavLinks({ links, className = "" }: { links: NavLink[]; className?: string }) {
  return (
    <>
      {links.map((link) => (
        <Link className={className} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </>
  );
}

export function buildDashboardLinks(permissions: {
  inventoryView: boolean;
  incidentCreate: boolean;
  reportExport: boolean;
  userManage: boolean;
  auditView: boolean;
}): NavLink[] {
  const links: NavLink[] = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/inspecciones", label: "Inspecciones" },
  ];
  if (permissions.inventoryView) links.push({ href: "/inventario", label: "Inventario" });
  if (permissions.incidentCreate) links.push({ href: "/novedades", label: "Novedades" });
  if (permissions.reportExport) links.push({ href: "/reportes", label: "Reportes" });
  if (permissions.userManage) links.push({ href: "/administracion/usuarios", label: "Usuarios" });
  if (permissions.auditView) links.push({ href: "/administracion/auditoria", label: "Auditoría" });
  return links;
}
