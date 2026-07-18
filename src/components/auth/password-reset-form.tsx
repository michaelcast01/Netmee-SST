"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function PasswordResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password"));
    setPending(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (result.error) return setMessage("El enlace es inválido, expiró o la contraseña no cumple los requisitos.");
    window.location.assign("/login?reset=success");
  }

  if (!token) return <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">El enlace de recuperación no es válido.</p>;
  return <form className="mt-8 space-y-5" onSubmit={handleSubmit}><div><label className="text-sm font-medium" htmlFor="password">Nueva contraseña</label><input autoComplete="new-password" className="auth-input" id="password" maxLength={128} minLength={12} name="password" required type="password" /><p className="mt-2 text-xs text-[var(--muted)]">Usa al menos 12 caracteres.</p></div>{message ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{message}</p> : null}<button className="auth-button" disabled={pending} type="submit">{pending ? "Guardando…" : "Guardar contraseña"}</button></form>;
}
