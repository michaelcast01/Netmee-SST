"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function EvidenceUploader({ inspectionId }: { inspectionId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [qualityMessage, setQualityMessage] = useState("");

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function inspectPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
    setQualityMessage("");
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const shortestSide = Math.min(bitmap.width, bitmap.height);
      setQualityMessage(shortestSide < 720
        ? "La resolución es baja. Acércate y toma otra fotografía para mejorar la detección."
        : `Resolución adecuada: ${bitmap.width} × ${bitmap.height} px.`);
      bitmap.close();
    } catch {
      setQualityMessage("No se pudo comprobar la resolución; revisa visualmente la fotografía.");
    }
  }

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
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setQualityMessage("");
      if (result.data?.id) {
        const analysisResponse = await fetch(`/api/v1/evidence/${result.data.id}/analyze`, { method: "POST" });
        setMessage(analysisResponse.ok ? "Evidencia cargada. El análisis de IA está en curso." : "Evidencia cargada. Puedes iniciar el análisis desde su tarjeta.");
      } else setMessage("Evidencia cargada correctamente.");
      router.refresh();
    } catch {
      setMessage("No se pudo completar la carga. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="rounded-xl border border-dashed border-violet-300 bg-violet-50 p-4" onSubmit={handleSubmit}>
      <label className="text-sm font-semibold" htmlFor="evidence-file">Captura guiada de cuerpo completo</label>
      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Usa la cámara trasera, buena iluminación y encuadra cabeza, torso, manos y pies. Evita objetos que oculten el EPP.</p>
      <input accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-3 block w-full text-sm" id="evidence-file" name="file" onChange={inspectPhoto} required type="file" />
      {previewUrl ? (
        <div className="relative mt-3 aspect-[3/4] max-h-80 overflow-hidden rounded-xl border border-violet-200 bg-slate-100">
          <Image alt="Vista previa de la evidencia" className="object-contain" fill sizes="(max-width: 768px) 100vw, 400px" src={previewUrl} unoptimized />
        </div>
      ) : null}
      {qualityMessage ? <p className="mt-2 text-xs font-medium" role="status">{qualityMessage}</p> : null}
      <ul className="mt-3 grid gap-1 text-[11px] text-[var(--muted)] sm:grid-cols-2">
        <li>✓ Una persona principal</li><li>✓ Cuerpo completo visible</li><li>✓ Imagen enfocada</li><li>✓ Sin contraluz</li>
      </ul>
      <p className="mt-2 text-xs text-[var(--muted)]">JPEG, PNG o WebP. Máximo 10 MB.</p>
      {message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
      <button className="mt-3 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">{pending ? "Cargando y analizando…" : "Cargar y analizar fotografía"}</button>
    </form>
  );
}
