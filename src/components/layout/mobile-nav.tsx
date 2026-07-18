"use client";

import Link from "next/link";
import { useState } from "react";

import type { NavLink } from "./dashboard-nav";

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? "Cerrar" : "Menú"}
      </button>
      {open ? (
        <nav className="absolute inset-x-0 top-full z-50 border-b border-white/10 bg-[var(--navy)] px-6 py-4 shadow-lg">
          <div className="flex flex-col gap-3 text-sm text-slate-200">
            {links.map((link) => (
              <Link className="rounded-lg px-2 py-2 hover:bg-white/10" href={link.href} key={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
