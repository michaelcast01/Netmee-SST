import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";
import { createPpeItemAction } from "../actions";

export const metadata: Metadata = { title: "Registrar EPP" };

export default async function NewPpeItemPage() {
  await requirePermission("inventory.update");
  const ppeTypes = await getPrisma().ppeType.findMany({ orderBy: { name: "asc" } });
  return <main className="mx-auto max-w-3xl px-6 py-8"><p className="text-sm font-semibold text-[var(--brand)]">INVENTARIO</p><h1 className="mt-2 text-3xl font-semibold">Registrar elemento</h1><form action={createPpeItemAction} className="mt-7 grid gap-5 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm sm:grid-cols-2"><div className="sm:col-span-2"><label className="text-sm font-semibold" htmlFor="ppeTypeId">Tipo de EPP</label><select className="auth-input" id="ppeTypeId" name="ppeTypeId" required><option value="">Selecciona…</option>{ppeTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div><div><label className="text-sm font-semibold" htmlFor="serialNumber">Número de serie</label><input className="auth-input" id="serialNumber" maxLength={100} name="serialNumber" /></div><div><label className="text-sm font-semibold" htmlFor="size">Talla</label><input className="auth-input" id="size" maxLength={30} name="size" /></div><div className="sm:col-span-2"><label className="text-sm font-semibold" htmlFor="expiresAt">Fecha de vencimiento</label><input className="auth-input" id="expiresAt" name="expiresAt" type="date" /></div><button className="auth-button sm:col-span-2" type="submit">Guardar elemento</button></form></main>;
}
