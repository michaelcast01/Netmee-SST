"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Assessment = {
  name: string;
  status: "DETECTED" | "MISSING" | "UNCERTAIN";
  confidence: number;
  reason: string;
};

type AnalysisResult = {
  compliant: boolean;
  personDetected: boolean;
  imageQuality: "GOOD" | "ACCEPTABLE" | "POOR";
  detectedPpe: string[];
  missingPpe: string[];
  uncertainPpe: string[];
  assessments: Assessment[];
  confidence: number;
  summary: string;
};

export type AnalysisSnapshot = {
  id: string;
  status: string;
  confidence: number | null;
  result: unknown;
  modelVersion: string;
  createdAt: string;
  needsReview?: boolean;
};

const activeStatuses = new Set(["PENDING", "PROCESSING"]);

function asResult(value: unknown): AnalysisResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<AnalysisResult>;
  if (!Array.isArray(candidate.assessments) || typeof candidate.summary !== "string" || typeof candidate.compliant !== "boolean") return null;
  return candidate as AnalysisResult;
}

function statusLabel(status: string) {
  return ({
    PENDING: "En cola",
    PROCESSING: "Analizando imagen…",
    DETECTED: "Faltan implementos",
    NOT_DETECTED: "EPP completo",
    LOW_CONFIDENCE: "Revisión manual necesaria",
    CONFIRMED: "Hallazgo confirmado",
    DISCARDED: "Hallazgo descartado",
    ERROR: "No se pudo analizar",
  } as Record<string, string>)[status] ?? status;
}

export function EvidenceAnalysis({ evidenceId, initialAnalysis, canValidate = false }: { evidenceId: string; initialAnalysis: AnalysisSnapshot | null; canValidate?: boolean }) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [message, setMessage] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationNotes, setValidationNotes] = useState("");
  const result = asResult(analysis?.result);
  const analysisId = analysis?.id;
  const analysisStatus = analysis?.status;

  useEffect(() => {
    if (!analysisId || !analysisStatus || !activeStatuses.has(analysisStatus)) return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();

    async function poll() {
      attempts += 1;
      try {
        const response = await fetch(`/api/v1/evidence/${evidenceId}/analyze`, { cache: "no-store", signal: controller.signal });
        const payload = (await response.json()) as { data?: AnalysisSnapshot | null; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "No se pudo consultar el análisis.");
        if (cancelled || !payload.data) return;
        setAnalysis(payload.data);
        if (activeStatuses.has(payload.data.status) && attempts < 45) timer = setTimeout(poll, 2_000);
        else if (!activeStatuses.has(payload.data.status)) router.refresh();
        else setMessage("El análisis continúa en segundo plano. Puedes volver a esta página en unos minutos.");
      } catch {
        if (!cancelled && attempts < 5) timer = setTimeout(poll, 3_000);
        else if (!cancelled) setMessage("No se pudo actualizar el estado. Recarga la página para intentarlo de nuevo.");
      }
    }

    timer = setTimeout(poll, 1_500);
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [analysisId, analysisStatus, evidenceId, router]);

  async function requestAnalysis() {
    setRequesting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/evidence/${evidenceId}/analyze`, { method: "POST" });
      const payload = (await response.json()) as { data?: { id: string; status: string }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "No se pudo iniciar el análisis.");
      setAnalysis({ ...payload.data, confidence: null, result: null, modelVersion: "", createdAt: new Date().toISOString() });
      setMessage("Análisis iniciado. El resultado aparecerá aquí automáticamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar el análisis.");
    } finally {
      setRequesting(false);
    }
  }

  async function validateAnalysis(confirmed: boolean) {
    if (!analysis) return;
    setValidating(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/ai-alerts/${analysis.id}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed, notes: validationNotes || undefined }),
      });
      const payload = (await response.json()) as { data?: { status: string; correctiveActionCreated: boolean }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "No se pudo guardar la validación.");
      setAnalysis((current) => current ? { ...current, status: payload.data!.status, needsReview: false } : current);
      setMessage(payload.data.correctiveActionCreated
        ? "Validación guardada. Se creó una novedad y una acción correctiva automáticamente."
        : "Validación humana guardada correctamente.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la validación.");
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold">Verificación de EPP con IA</p>
        {analysis ? <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold">{statusLabel(analysis.status)}</span> : null}
      </div>

      {result ? (
        <div className="mt-3 space-y-3">
          <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${result.compliant ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
            {result.compliant ? "La imagen muestra todos los EPP obligatorios." : "La imagen no permite confirmar el cumplimiento completo."}
            <span className="ml-1 font-normal">Confianza: {Math.round(result.confidence * 100)}%</span>
          </div>
          <p className="text-xs text-[var(--muted)]">{result.summary}</p>
          <ul className="space-y-2">
            {result.assessments.map((item) => (
              <li className="rounded-lg border border-[var(--line)] bg-white px-3 py-2" key={item.name}>
                <div className="flex justify-between gap-3 text-xs">
                  <strong>{item.name}</strong>
                  <span>{item.status === "DETECTED" ? "Visible" : item.status === "MISSING" ? "No visible" : "No concluyente"} · {Math.round(item.confidence * 100)}%</span>
                </div>
                <p className="mt-1 text-[11px] text-[var(--muted)]">{item.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : analysis && activeStatuses.has(analysis.status) ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Procesando de forma segura en segundo plano…</p>
      ) : null}

      {canValidate && analysis?.needsReview && result ? (
        <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3">
          <label className="text-xs font-semibold" htmlFor={`validation-notes-${analysis.id}`}>Validación del responsable SST</label>
          <textarea
            className="mt-2 min-h-20 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs"
            id={`validation-notes-${analysis.id}`}
            maxLength={500}
            onChange={(event) => setValidationNotes(event.target.value)}
            placeholder="Observación de la revisión humana"
            value={validationNotes}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={validating} onClick={() => validateAnalysis(true)} type="button">Confirmar resultado</button>
            <button className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={validating} onClick={() => validateAnalysis(false)} type="button">Descartar resultado</button>
          </div>
        </div>
      ) : null}

      {!analysis || ["ERROR", "DETECTED", "NOT_DETECTED", "LOW_CONFIDENCE", "CONFIRMED", "DISCARDED"].includes(analysis.status) ? (
        <button className="mt-3 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50" disabled={requesting} onClick={requestAnalysis} type="button">
          {requesting ? "Iniciando…" : analysis ? "Analizar de nuevo" : "Analizar con IA"}
        </button>
      ) : null}
      {message ? <p className="mt-2 text-xs" role="status">{message}</p> : null}
      <p className="mt-3 text-[10px] leading-4 text-[var(--muted)]">Resultado orientativo. Una persona responsable de SST debe validar cualquier hallazgo antes de tomar decisiones.</p>
    </div>
  );
}
