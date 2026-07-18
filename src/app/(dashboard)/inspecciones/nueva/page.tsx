import type { Metadata } from "next";

import { requirePermission } from "@/lib/auth/dal";
import { getPrisma } from "@/lib/db/prisma";
import { createInspectionAction } from "../actions";

export const metadata: Metadata = { title: "Nueva inspección" };

export default async function NewInspectionPage() {
  await requirePermission("inspection.create");
  const activities = await getPrisma().activity.findMany({ where: { active: true, ppeRequirements: { some: {} } }, orderBy: { name: "asc" }, include: { ppeRequirements: { include: { ppeType: true } }, hazards: { include: { hazard: true } } } });
  return <main className="mx-auto max-w-3xl px-6 py-8"><p className="text-sm font-semibold text-[var(--brand)]">NUEVA INSPECCIÓN</p><h1 className="mt-2 text-3xl font-semibold">Selecciona la actividad</h1><p className="mt-2 text-sm text-[var(--muted)]">La lista de EPP se generará automáticamente desde la matriz vigente.</p><form action={createInspectionAction} className="mt-7 space-y-5 rounded-2xl border border-[var(--line)] bg-white p-6 shadow-sm"><div><label className="text-sm font-semibold" htmlFor="activityId">Actividad</label><select className="auth-input" id="activityId" name="activityId" required><option value="">Selecciona una actividad</option>{activities.map((activity) => <option key={activity.id} value={activity.id}>{activity.name} · {activity.ppeRequirements.length} EPP · {activity.hazards.length} peligros</option>)}</select></div><div><label className="text-sm font-semibold" htmlFor="scheduledAt">Fecha programada</label><input className="auth-input" id="scheduledAt" name="scheduledAt" type="datetime-local" /></div>{activities.length === 0 ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Primero debe configurarse una actividad con su matriz de EPP.</p> : <button className="auth-button" type="submit">Crear inspección</button>}</form></main>;
}
