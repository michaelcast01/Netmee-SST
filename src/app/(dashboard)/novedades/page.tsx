import type { Metadata } from "next";
import { CheckCircle2, ClipboardPlus } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { getPrisma } from "@/lib/db/prisma";
import { displayLabel } from "@/lib/display-labels";
import {
  closeCorrectiveAction,
  createCorrectiveAction,
  createIncidentAction,
} from "./actions";

export const metadata: Metadata = { title: "Novedades y acciones" };

const severityLabel = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
} as const;

export default async function IncidentsPage() {
  const user = await requireUser();
  const canCreate = hasPermission(user.permissions, "incident.create");
  const canManage = hasPermission(user.permissions, "corrective_action.manage");
  const prisma = getPrisma();
  const [incidents, users, inspections] = await Promise.all([
    prisma.incident.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        reportedBy: { select: { name: true } },
        inspection: { select: { code: true } },
        actions: {
          orderBy: { dueAt: "asc" },
          include: { responsible: { select: { name: true } } },
        },
      },
    }),
    canManage
      ? prisma.user.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    canCreate
      ? prisma.inspection.findMany({
          where: hasPermission(user.permissions, "inspection.review")
            ? undefined
            : { workerId: user.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: { id: true, code: true },
        })
      : Promise.resolve([]),
  ]);
  return (
    <main className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      <PageHeader description="Registra hallazgos, asigna responsables y verifica su cierre." eyebrow="MEJORA CONTINUA" icon={ClipboardPlus} title="Novedades y acciones correctivas" />
      {canCreate ? (
        <form
          action={createIncidentAction}
          className="surface-card mt-7 grid gap-4 rounded-2xl p-6 sm:grid-cols-2"
        >
          <h2 className="font-semibold sm:col-span-2">Registrar novedad</h2>
          <div>
            <label className="text-sm font-medium" htmlFor="title">
              Título
            </label>
            <input
              className="auth-input"
              id="title"
              maxLength={160}
              minLength={5}
              name="title"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="severity">
              Severidad
            </label>
            <select
              className="auth-input"
              id="severity"
              name="severity"
              required
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="description">
              Descripción
            </label>
            <textarea
              className="auth-input min-h-24"
              id="description"
              maxLength={2000}
              minLength={10}
              name="description"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="inspectionId">
              Inspección relacionada
            </label>
            <select
              className="auth-input"
              id="inspectionId"
              name="inspectionId"
            >
              <option value="">Ninguna</option>
              {inspections.map((inspection) => (
                <option key={inspection.id} value={inspection.id}>
                  {inspection.code}
                </option>
              ))}
            </select>
          </div>
          <button className="auth-button self-end" type="submit">
            Registrar novedad
          </button>
        </form>
      ) : null}
      <section className="mt-7 space-y-4">
        {incidents.map((incident) => (
          <article
            className="surface-card rounded-2xl p-6"
            key={incident.id}
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs font-semibold text-[var(--brand)]">
                    {incident.code}
                  </p>
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    {severityLabel[incident.severity]}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                    {displayLabel(incident.status)}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold">{incident.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {incident.description}
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Reportó: {incident.reportedBy.name}
                  {incident.inspection ? ` · ${incident.inspection.code}` : ""}
                </p>
              </div>
            </div>
            {incident.actions.length ? (
              <div className="mt-5 space-y-3 border-t border-[var(--line)] pt-5">
                {incident.actions.map((action) => (
                  <div className="data-row rounded-xl p-4" key={action.id}>
                    <div className="flex flex-col justify-between gap-2 sm:flex-row">
                      <div>
                        <p className="text-sm font-semibold">
                          {action.description}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {action.responsible.name} · vence{" "}
                          {action.dueAt.toLocaleDateString("es-CO")} ·{" "}
                          {displayLabel(action.status)}
                        </p>
                      </div>
                      {canManage &&
                      action.status !== "COMPLETED" &&
                      action.status !== "CANCELLED" ? (
                        <form
                          action={closeCorrectiveAction}
                          className="flex flex-col gap-2 sm:max-w-sm"
                        >
                          <input
                            name="actionId"
                            type="hidden"
                            value={action.id}
                          />
                          <input
                            className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
                            maxLength={1500}
                            minLength={10}
                            name="closureNotes"
                            placeholder="Evidencia o nota de cierre"
                            required
                          />
                          <button
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                            type="submit"
                          >
                            Verificar cierre
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {canManage ? (
              <form
                action={createCorrectiveAction}
                className="mt-5 grid gap-3 border-t border-[var(--line)] pt-5 sm:grid-cols-3"
              >
                <input name="incidentId" type="hidden" value={incident.id} />
                <input
                  className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
                  maxLength={1500}
                  minLength={10}
                  name="description"
                  placeholder="Nueva acción correctiva"
                  required
                />
                <select
                  className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs"
                  name="responsibleId"
                  required
                >
                  <option value="">Responsable…</option>
                  {users.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-3 py-2 text-xs"
                    name="dueAt"
                    required
                    type="date"
                  />
                  <button
                    className="rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white"
                    type="submit"
                  >
                    Asignar
                  </button>
                </div>
              </form>
            ) : null}
          </article>
        ))}
        {incidents.length === 0 ? (
          <EmptyState description="Cuando se registre un hallazgo o la IA genere una acción correctiva, aparecerá aquí." icon={CheckCircle2} title="No hay novedades pendientes" />
        ) : null}
      </section>
    </main>
  );
}
