export type NavLink = { href: string; label: string; group?: "administration" };

export function buildDashboardLinks(permissions: {
  inventoryView: boolean;
  incidentCreate: boolean;
  inspectionReview: boolean;
  reportExport: boolean;
  userManage: boolean;
  auditView: boolean;
}): NavLink[] {
  const links: NavLink[] = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/inspecciones", label: "Inspecciones" },
  ];
  if (permissions.inspectionReview) links.push({ href: "/validaciones-ia", label: "Validaciones IA" });
  if (permissions.inventoryView) links.push({ href: "/inventario", label: "Inventario" });
  if (permissions.incidentCreate) links.push({ href: "/novedades", label: "Novedades" });
  if (permissions.reportExport) links.push({ href: "/reportes", label: "Reportes" });
  if (permissions.userManage) links.push({ href: "/administracion/usuarios", label: "Usuarios", group: "administration" });
  if (permissions.auditView) links.push({ href: "/administracion/auditoria", label: "Auditoría", group: "administration" });
  return links;
}
