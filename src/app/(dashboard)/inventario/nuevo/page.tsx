import type { Metadata } from "next";

import { PpeItemForm } from "@/components/inventory/ppe-item-form";
import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Registrar EPP" };

export default async function NewPpeItemPage() {
  await requirePermission("inventory.update");
  const ppeTypes = await getPrisma().ppeType.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return <main className="mx-auto max-w-3xl px-6 py-8"><p className="text-sm font-semibold text-[var(--brand)]">INVENTARIO</p><h1 className="mt-2 text-3xl font-semibold">Registrar elemento con fotografía</h1><p className="mt-2 text-sm text-[var(--muted)]">La imagen queda protegida en almacenamiento privado y asociada a la trazabilidad del elemento.</p><PpeItemForm ppeTypes={ppeTypes} /></main>;
}
