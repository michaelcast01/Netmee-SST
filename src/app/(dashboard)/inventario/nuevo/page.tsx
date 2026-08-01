import type { Metadata } from "next";
import { PackagePlus } from "lucide-react";

import { PpeItemForm } from "@/components/inventory/ppe-item-form";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Registrar EPP" };

export default async function NewPpeItemPage() {
  await requirePermission("inventory.update");
  const ppeTypes = await getPrisma().ppeType.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8"><PageHeader description="La imagen queda protegida en almacenamiento privado y asociada a la trazabilidad del elemento." eyebrow="INVENTARIO" icon={PackagePlus} title="Registrar elemento con fotografía" /><PpeItemForm ppeTypes={ppeTypes} /></main>;
}
