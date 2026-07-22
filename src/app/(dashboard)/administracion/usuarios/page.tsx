import type { Metadata } from "next";
import { UsersRound } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/dal";
import { roles } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { displayLabel } from "@/lib/display-labels";
import { assignRoleAction } from "./actions";

export const metadata: Metadata = { title: "Administración de usuarios" };

export default async function UsersPage() {
  await requirePermission("user.manage");
  const users = await getPrisma().user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      roles: { select: { role: { select: { code: true } } } },
    },
  });
  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader description="Gestiona responsabilidades con trazabilidad de cada cambio de acceso." eyebrow="ADMINISTRACIÓN" icon={UsersRound} title="Usuarios y roles" />
      <div className="mt-6 space-y-3 md:hidden">
        {users.map((user) => (
          <article
            className="surface-card rounded-2xl p-4"
            key={user.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{user.name}</h2>
                <p className="mt-1 break-all text-xs text-[var(--muted)]">
                  {user.email}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
              >
                {user.active ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="data-row mt-4 rounded-xl p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Roles actuales
              </p>
              <p className="mt-1 text-sm">
                {user.roles
                  .map(({ role }) => displayLabel(role.code))
                  .join(", ") || "Sin rol"}
              </p>
            </div>
            <form action={assignRoleAction} className="mt-4 grid gap-2">
              <input name="userId" type="hidden" value={user.id} />
              <label
                className="text-xs font-semibold text-[var(--muted)]"
                htmlFor={`role-${user.id}`}
              >
                Asignar un rol
              </label>
              <select
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-3 text-sm"
                id={`role-${user.id}`}
                name="roleCode"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {displayLabel(role)}
                  </option>
                ))}
              </select>
              <button
                className="brand-cta rounded-lg px-4 py-3 text-sm font-semibold text-white"
                type="submit"
              >
                Asignar rol
              </button>
            </form>
          </article>
        ))}
      </div>
      <div className="surface-card mt-7 hidden overflow-hidden rounded-2xl md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-violet-50/70 text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4">Usuario</th>
                <th className="px-5 py-4">Roles</th>
                <th className="px-5 py-4">Asignar rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {users.map((user) => (
                <tr className="transition-colors hover:bg-violet-50/60" key={user.id}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{user.name}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {user.email} · {user.active ? "Activo" : "Inactivo"}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {user.roles
                      .map(({ role }) => displayLabel(role.code))
                      .join(", ") || "Sin rol"}
                  </td>
                  <td className="px-5 py-4">
                    <form
                      action={assignRoleAction}
                      className="flex min-w-56 flex-col gap-2 sm:flex-row"
                    >
                      <input name="userId" type="hidden" value={user.id} />
                      <select
                        className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs"
                        name="roleCode"
                      >
                        {roles.map((role) => (
                          <option key={role} value={role}>
                            {displayLabel(role)}
                          </option>
                        ))}
                      </select>
                      <button
                        className="brand-cta rounded-lg px-3 py-2 text-xs font-semibold text-white"
                        type="submit"
                      >
                        Asignar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
