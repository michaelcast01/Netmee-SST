import type { Metadata } from "next";
import Link from "next/link";

import { PasswordResetRequestForm } from "@/components/auth/password-reset-request-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPasswordPage() {
  return <><p className="text-sm font-semibold text-[var(--brand)]">RECUPERACIÓN</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Recupera tu acceso</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Te enviaremos un enlace temporal si el correo pertenece a una cuenta activa.</p><PasswordResetRequestForm /><Link className="mt-6 block text-center text-sm font-semibold text-[var(--brand)]" href="/login">Volver al inicio de sesión</Link></>;
}
