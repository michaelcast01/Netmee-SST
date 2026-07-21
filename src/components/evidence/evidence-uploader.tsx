"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EvidenceUploader({ inspectionId }: { inspectionId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/inspections/${inspectionId}/evidence`, { method: "POST", body: new FormData(formElement) });
      const result = (await response.json()) as { data?: { id: string }; error?: string };
      if (!response.ok) return setMessage(result.error ?? "No se pudo cargar la evidencia.");
      formElement.reset();
      if (result.data?.id) {
        const analysisResponse = await fetch(`/api/v1/evidence/${result.data.id}/analyze`, { method: "POST" });
        setMessage(analysisResponse.ok ? "Evidencia cargada. El análisis de IA está en curso." : "Evidencia cargada. Puedes iniciar el análisis desde su tarjeta.");
      } else {
        setMessage("Evidencia cargada correctamente.");
      }
      router.refresh();
    } catch {
      setMessage("No se pudo completar la carga. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return <form className="rounded-xl border border-dashed border-violet-300 bg-violet-50 p-4" onSubmit={handleSubmit}><label className="text-sm font-semibold" htmlFor="evidence-file">Agregar fotografía</label><input accept="image/jpeg,image/png,image/webp" className="mt-3 block w-full text-sm" id="evidence-file" name="file" required type="file" /><p className="mt-2 text-xs text-[var(--muted)]">JPEG, PNG o WebP. Máximo 10 MB.</p>{message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}<button className="mt-3 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white" disabled={pending} type="submit">{pending ? "Cargando…" : "Cargar evidencia"}</button></form>;
}
