import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { roles } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { assignRoleAction } from "./actions";

export const metadata: Metadata = { title: "Administración de usuarios" };

export default async function UsersPage() {
  await requirePermission("user.manage");
  const users = await getPrisma().user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true, active: true, roles: { select: { role: { select: { code: true } } } } } });
  return <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8"><p className="text-sm font-semibold text-[var(--brand)]">ADMINISTRACIÓN</p><h1 className="mt-2 text-3xl font-semibold">Usuarios y roles</h1><p className="mt-2 text-sm text-[var(--muted)]">Los cambios quedan registrados en auditoría.</p><div className="mt-7 overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-[var(--line)] bg-slate-50 text-xs uppercase text-[var(--muted)]"><tr><th className="px-5 py-4">Usuario</th><th className="px-5 py-4">Roles</th><th className="px-5 py-4">Asignar rol</th></tr></thead><tbody className="divide-y divide-[var(--line)]">{users.map((user) => <tr key={user.id}><td className="px-5 py-4"><p className="font-semibold">{user.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{user.email} · {user.active ? "Activo" : "Inactivo"}</p></td><td className="px-5 py-4 text-xs">{user.roles.map(({ role }) => role.code).join(", ") || "Sin rol"}</td><td className="px-5 py-4"><form action={assignRoleAction} className="flex min-w-64 gap-2"><input name="userId" type="hidden" value={user.id} /><select className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs" name="roleCode">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select><button className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white" type="submit">Asignar</button></form></td></tr>)}</tbody></table></div></div></main>;
}
