"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  return <button className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10" disabled={pending} onClick={async () => { setPending(true); await authClient.signOut(); window.location.assign("/login"); }} type="button">{pending ? "Cerrando…" : "Cerrar sesión"}</button>;
}
