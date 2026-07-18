import type { Metadata } from "next";
import { Suspense } from "react";

import { PasswordResetForm } from "@/components/auth/password-reset-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ResetPasswordPage() {
  return <><p className="text-sm font-semibold text-[var(--brand)]">SEGURIDAD</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Crea una nueva contraseña</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">El enlace solo puede utilizarse durante un tiempo limitado.</p><Suspense fallback={<p className="mt-6 text-sm text-[var(--muted)]">Validando enlace…</p>}><PasswordResetForm /></Suspense></>;
}
