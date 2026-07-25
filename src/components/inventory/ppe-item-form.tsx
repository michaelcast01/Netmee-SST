"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PpeTypeOption = { id: string; name: string };

export function PpeItemForm({ ppeTypes }: { ppeTypes: PpeTypeOption[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function previewImage(event: React.ChangeEvent<HTMLInputElement>) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file = event.target.files?.[0];
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/inventory/items", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const payload = await response.json() as { data?: { id: string }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "No se pudo registrar el elemento.");
      router.push(`/inventario?created=${encodeURIComponent(payload.data.id)}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el elemento.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="surface-card mt-7 grid gap-5 rounded-2xl p-6 sm:grid-cols-2" onSubmit={submit}>
      <div className="sm:col-span-2">
        <label className="text-sm font-semibold" htmlFor="ppeTypeId">Tipo de EPP</label>
        <select className="auth-input" id="ppeTypeId" name="ppeTypeId" required>
          <option value="">Selecciona…</option>
          {ppeTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="serialNumber">Número de serie</label>
        <input className="auth-input" id="serialNumber" maxLength={100} name="serialNumber" />
      </div>
      <div>
        <label className="text-sm font-semibold" htmlFor="size">Talla</label>
        <input className="auth-input" id="size" maxLength={30} name="size" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-semibold" htmlFor="expiresAt">Fecha de vencimiento</label>
        <input className="auth-input" id="expiresAt" name="expiresAt" type="date" />
      </div>
      <div className="sm:col-span-2">
        <label className="text-sm font-semibold" htmlFor="ppe-image">Fotografía del elemento</label>
        <p className="mt-1 text-xs text-[var(--muted)]">Toma una foto clara del elemento real, su etiqueta y estado. JPEG, PNG o WebP; máximo 10 MB.</p>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="auth-input"
          id="ppe-image"
          name="image"
          onChange={previewImage}
          required
          type="file"
        />
        {previewUrl ? (
          <div className="relative mt-3 aspect-video overflow-hidden rounded-xl border border-[var(--line)] bg-slate-100">
            <Image alt="Vista previa del elemento de protección" className="object-contain" fill sizes="(max-width: 768px) 100vw, 720px" src={previewUrl} unoptimized />
          </div>
        ) : null}
      </div>
      {message ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2" role="alert">{message}</p> : null}
      <button className="auth-button sm:col-span-2" disabled={pending} type="submit">
        {pending ? "Guardando fotografía y trazabilidad…" : "Guardar elemento"}
      </button>
    </form>
  );
}
