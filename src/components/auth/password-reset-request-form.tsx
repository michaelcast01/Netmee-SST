"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function PasswordResetRequestForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const email = String(new FormData(event.currentTarget).get("email"));
    await authClient.requestPasswordReset({ email, redirectTo: "/restablecer-clave" });
    setPending(false);
    setMessage("Si el correo está registrado, recibirás instrucciones para continuar.");
  }

  return <form className="mt-8 space-y-5" onSubmit={handleSubmit}><div><label className="text-sm font-medium" htmlFor="email">Correo corporativo</label><input autoComplete="email" className="auth-input" id="email" name="email" required type="email" /></div>{message ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700" role="status">{message}</p> : null}<button className="auth-button" disabled={pending} type="submit">{pending ? "Enviando…" : "Enviar instrucciones"}</button></form>;
}
