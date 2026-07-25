"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PpeImageUploader({ itemId, hasImage }: { itemId: string; hasImage: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const form = event.currentTarget;
      const response = await fetch(`/api/v1/inventory/items/${itemId}/image`, {
        method: "POST",
        body: new FormData(form),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No se pudo actualizar la fotografía.");
      form.reset();
      setMessage("Fotografía actualizada.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la fotografía.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-3" onSubmit={submit}>
      <label className="block text-xs font-semibold" htmlFor={`item-image-${itemId}`}>
        {hasImage ? "Reemplazar fotografía" : "Agregar fotografía"}
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          accept="image/jpeg,image/png,image/webp"
          className="block min-w-0 flex-1 text-xs"
          id={`item-image-${itemId}`}
          name="image"
          required
          type="file"
        />
        <button className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50" disabled={pending} type="submit">
          {pending ? "Subiendo…" : "Actualizar"}
        </button>
      </div>
      {message ? <p className="mt-2 text-xs" role="status">{message}</p> : null}
    </form>
  );
}
