import "server-only";

import { Resend } from "resend";

let resend: Resend | undefined;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY no está configurada.");
  resend ??= new Resend(apiKey);
  return resend;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM no está configurada.");

  const safeUrl = escapeHtml(resetUrl);
  const { error } = await getResend().emails.send(
    {
      from,
      to,
      subject: "Restablece tu contraseña de NETMEE EPP Seguro",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172036"><h1 style="font-size:24px">Restablecer contraseña</h1><p>Recibimos una solicitud para cambiar tu contraseña.</p><p><a href="${safeUrl}" style="display:inline-block;background:#6547c7;color:white;padding:12px 18px;border-radius:10px;text-decoration:none">Crear nueva contraseña</a></p><p style="color:#657089;font-size:13px">Si no solicitaste este cambio, ignora el mensaje. El enlace expirará automáticamente.</p></div>`,
    },
    { headers: { "Idempotency-Key": `password-reset-${crypto.randomUUID()}` } },
  );

  if (error) throw new Error("No se pudo enviar el correo de recuperación.");
}
