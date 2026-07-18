"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
      rememberMe: false,
    });
    setPending(false);

    if (result.error) {
      setError("Correo o contraseña incorrectos. Verifica tus datos e intenta nuevamente.");
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <form className="mt-8 space-y-5" method="post" onSubmit={handleSubmit}>
      <div>
        <label className="text-sm font-medium" htmlFor="email">Correo corporativo</label>
        <input autoComplete="email" className="auth-input" id="email" name="email" placeholder="nombre@netmee.com" required type="email" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" htmlFor="password">Contraseña</label>
          <a className="text-xs font-semibold text-[var(--brand)]" href="/recuperar-clave">¿Olvidaste tu contraseña?</a>
        </div>
        <input autoComplete="current-password" className="auth-input" id="password" minLength={12} name="password" required type="password" />
      </div>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}
      <button className="auth-button" disabled={pending} type="submit">{pending ? "Verificando…" : "Iniciar sesión"}</button>
    </form>
  );
}
