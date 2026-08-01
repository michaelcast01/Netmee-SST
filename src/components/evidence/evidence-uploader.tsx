"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Camera, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const photoChecks = ["Una persona principal", "Cuerpo completo visible", "Imagen enfocada", "Sin contraluz"];

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
    <form className="rounded-xl bg-card p-5 text-card-foreground shadow-sm ring-1 ring-border" onSubmit={handleSubmit}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
          <Camera aria-hidden className="size-5" />
        </span>
        <div>
          <label className="text-sm font-semibold text-card-foreground" htmlFor="evidence-file">Captura guiada de cuerpo completo</label>
          <p className="mt-0.5 text-xs text-muted-foreground">Fotografía para verificación de los EPP obligatorios.</p>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-xs leading-5 text-muted-foreground">Usa la cámara trasera, buena iluminación y encuadra cabeza, torso, manos y pies. Evita objetos que oculten el EPP.</p>
      <input accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-3 block w-full rounded-lg border border-input bg-background p-1.5 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary/90" id="evidence-file" name="file" onChange={inspectPhoto} required type="file" />
      {previewUrl ? (
        <div className="relative mt-4 h-72 w-full max-w-lg overflow-hidden rounded-xl bg-muted ring-1 ring-border">
          <Image alt="Vista previa de la evidencia" className="object-contain" fill sizes="(max-width: 768px) 100vw, 400px" src={previewUrl} unoptimized />
        </div>
      ) : null}
      {qualityMessage ? <p className="mt-3 text-xs font-medium text-foreground" role="status">{qualityMessage}</p> : null}
      <ul className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        {photoChecks.map((check) => (
          <li className="flex items-center gap-2" key={check}>
            <CheckCircle2 aria-hidden className="size-4 shrink-0 text-emerald-600" />
            {check}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">JPEG, PNG o WebP. Máximo 10 MB.</p>
      {message ? <p className="mt-3 text-sm text-foreground" role="status">{message}</p> : null}
      <Button className="mt-4" disabled={pending} type="submit">{pending ? "Cargando y analizando…" : "Cargar y analizar fotografía"}</Button>
    </form>
  );
}
