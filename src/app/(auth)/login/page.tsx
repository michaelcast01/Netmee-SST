import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return <><p className="text-sm font-semibold text-[var(--brand)]">BIENVENIDO</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Inicia sesión</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Utiliza las credenciales asignadas por el administrador.</p><LoginForm /></>;
}
