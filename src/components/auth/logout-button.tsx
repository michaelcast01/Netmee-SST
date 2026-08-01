"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      className="border-white/15 bg-white/5 text-xs text-slate-100 hover:bg-white/12 hover:text-white"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        window.location.assign("/login");
      }}
      size="sm"
      type="button"
      variant="outline"
    >
      {pending ? "Cerrando…" : "Cerrar sesión"}
    </Button>
  );
}
