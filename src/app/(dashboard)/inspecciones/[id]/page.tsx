import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { EvidenceUploader } from "@/components/evidence/evidence-uploader";
import { StatusBadge } from "@/components/inspections/status-badge";
import { FlashMessage } from "@/components/ui/flash-message";
import { requireUser } from "@/lib/auth/dal";
import { hasPermission } from "@/lib/auth/permissions";
import { flashFromSearchParams } from "@/lib/actions/redirect-with-flash";
import { getPrisma } from "@/lib/db/prisma";
import { inspectionDecisionLabels, inspectionStatusLabels } from "@/modules/inspections";
import { reviewInspectionAction, setEvidenceLegalHoldAction, submitInspectionForReviewAction, updateInspectionItemAction } from "../actions";

export const metadata: Metadata = { title: "Detalle de inspección" };

export default async function InspectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const flash = flashFromSearchParams(await searchParams);
  const inspection = await getPrisma().inspection.findUnique({
    where: { id },
    include: {
      worker: { select: { name: true, email: true } },
      activity: { include: { hazards: { include: { hazard: true } } } },
      items: { orderBy: { ppeType: { name: "asc" } }, include: { ppeType: true } },
      evidence: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
      history: { orderBy: { createdAt: "desc" }, include: { changedBy: { select: { name: true } } } },
      approvals: { orderBy: { signedAt: "desc" }, include: { reviewer: { select: { name: true, email: true } } } },
    },
  });
  if (!inspection) notFound();
  const canReview = hasPermission(user.permissions, "inspection.review");
  if (inspection.workerId !== user.id && !canReview) redirect("/sin-acceso");

  const editable = inspection.workerId === user.id && ["BORRADOR", "EN_PROGRESO", "CORRECCION_PENDIENTE"].includes(inspection.status);
  const canSubmit = editable && ["EN_PROGRESO", "CORRECCION_PENDIENTE"].includes(inspection.status);
  const verified = inspection.items.filter((item) => item.compliant !== null).length;
  const requiredPending = inspection.items.some((item) => item.required && item.compliant !== true);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-[var(--brand)]">{inspection.code}</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{inspection.activity.name}</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {inspection.worker.name} · {verified}/{inspection.items.length} elementos verificados
          </p>
          <a
            className="mt-3 inline-block rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
            href={`/api/v1/inspections/${inspection.id}/report.pdf`}
            target="_blank"
          >
            Exportar PDF trazable
          </a>
        </div>
        <StatusBadge status={inspection.status} />
      </div>

      <FlashMessage {...flash} />

      {inspection.status === "CORRECCION_PENDIENTE" && editable ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Esta inspección fue devuelta para corrección. Actualiza los elementos señalados y vuelve a enviarla a revisión.
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-semibold">Peligros asociados</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {inspection.activity.hazards.map(({ hazard }) => (
            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700" key={hazard.id}>
              {hazard.name}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold">Lista de verificación</h2>
        {inspection.items.map((item) => (
          <form action={updateInspectionItemAction} className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5" key={item.id}>
            <input name="inspectionId" type="hidden" value={inspection.id} />
            <input name="itemId" type="hidden" value={item.id} />
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <p className="font-semibold">{item.ppeType.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{item.required ? "Obligatorio" : "Complementario"}</p>
              </div>
              <select
                className="w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm sm:w-auto"
                defaultValue={item.compliant === null ? "" : String(item.compliant)}
                disabled={!editable}
                name="compliant"
                required
              >
                <option value="">Sin verificar</option>
                <option value="true">Cumple</option>
                <option value="false">No cumple</option>
              </select>
            </div>
            <textarea
              className="auth-input min-h-20 resize-y"
              defaultValue={item.observation ?? ""}
              disabled={!editable}
              maxLength={500}
              name="observation"
              placeholder="Observación del elemento"
            />
            {editable ? (
              <button className="mt-3 w-full rounded-lg bg-[var(--navy)] px-4 py-2 text-xs font-semibold text-white sm:w-auto" type="submit">
                Guardar elemento
              </button>
            ) : null}
          </form>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-semibold">Evidencias fotográficas</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {editable ? <EvidenceUploader inspectionId={inspection.id} /> : <p className="text-sm text-[var(--muted)]">La carga está cerrada para este estado.</p>}
          <div className="space-y-2">
            {inspection.evidence.map((evidence) => (
              <article className="rounded-xl border border-[var(--line)] p-3 text-sm" key={evidence.id}>
                <a className="break-all font-semibold hover:text-[var(--brand)]" href={`/api/v1/evidence/${evidence.id}`} target="_blank">
                  {evidence.fileName}
                </a>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  {evidence.uploadedBy.name} · {(evidence.fileSize / 1024).toFixed(0)} KB
                </span>
                <span className="mt-1 block text-xs text-[var(--muted)]">
                  Retención: {evidence.retentionUntil?.toLocaleDateString("es-CO") ?? "Sin definir"}
                  {evidence.legalHold ? " · Retención legal" : ""}
                </span>
                {canReview ? (
                  <form action={setEvidenceLegalHoldAction} className="mt-2">
                    <input name="inspectionId" type="hidden" value={inspection.id} />
                    <input name="evidenceId" type="hidden" value={evidence.id} />
                    <input name="legalHold" type="hidden" value={String(!evidence.legalHold)} />
                    <button className="text-xs font-semibold text-[var(--brand)]" type="submit">
                      {evidence.legalHold ? "Liberar retención legal" : "Activar retención legal"}
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
            {!inspection.evidence.length ? <p className="text-sm text-[var(--muted)]">Aún no hay fotografías.</p> : null}
          </div>
        </div>
      </section>

      {canSubmit ? (
        <form action={submitInspectionForReviewAction} className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:p-5">
          <input name="inspectionId" type="hidden" value={inspection.id} />
          <p className="text-sm text-violet-900">
            {requiredPending
              ? "Marca todos los EPP obligatorios como “Cumple” antes de enviar a revisión."
              : "Todos los EPP obligatorios están verificados. Puedes enviar la inspección a revisión."}
          </p>
          <button
            className="mt-3 w-full rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            disabled={requiredPending}
            type="submit"
          >
            Enviar a revisión
          </button>
        </form>
      ) : null}

      {canReview && inspection.status === "PENDIENTE_REVISION" ? (
        <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-semibold">Decisión y firma del responsable SST</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {(["APROBADA", "RECHAZADA"] as const).map((decision) => (
              <form action={reviewInspectionAction} className="rounded-xl border border-[var(--line)] p-4" key={decision}>
                <input name="inspectionId" type="hidden" value={inspection.id} />
                <input name="decision" type="hidden" value={decision} />
                <label className="text-sm font-semibold" htmlFor={`reason-${decision}`}>
                  {decision === "APROBADA" ? "Aprobar" : "Devolver para corrección"}
                </label>
                <input
                  className="auth-input"
                  defaultValue={user.name}
                  maxLength={120}
                  minLength={3}
                  name="signerName"
                  placeholder="Nombre completo para firma"
                  required
                />
                <textarea
                  className="auth-input min-h-24"
                  id={`reason-${decision}`}
                  maxLength={500}
                  minLength={3}
                  name="reason"
                  placeholder="Justificación obligatoria"
                  required
                />
                <p className="mt-2 text-xs text-[var(--muted)]">La confirmación genera una huella SHA-256 de la decisión firmada.</p>
                <button
                  className={`mt-3 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white sm:w-auto ${decision === "APROBADA" ? "bg-emerald-600" : "bg-red-600"}`}
                  type="submit"
                >
                  Confirmar y firmar
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      {inspection.approvals.length ? (
        <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="font-semibold">Firmas y aprobaciones</h2>
          <div className="mt-4 space-y-3">
            {inspection.approvals.map((approval) => (
              <article className="rounded-xl bg-slate-50 p-4" key={approval.id}>
                <p className="text-sm font-semibold">
                  {inspectionDecisionLabels[approval.decision]} · {approval.signerName}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {approval.reviewer.email} · {approval.signedAt.toLocaleString("es-CO")}
                </p>
                <p className="mt-2 text-sm">{approval.reason}</p>
                <p className="mt-2 break-all font-mono text-[10px] text-[var(--muted)]">SHA-256: {approval.signatureHash}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-semibold">Historial de cambios</h2>
        <ol className="mt-4 space-y-4">
          {inspection.history.map((entry) => (
            <li className="border-l-2 border-violet-200 pl-4" key={entry.id}>
              <p className="text-sm font-semibold">
                {entry.fromStatus ? inspectionStatusLabels[entry.fromStatus] : "Inicio"} → {inspectionStatusLabels[entry.toStatus]}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {entry.changedBy.name} · {entry.createdAt.toLocaleString("es-CO")}
              </p>
              {entry.reason ? <p className="mt-1 text-sm text-[var(--muted)]">{entry.reason}</p> : null}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
