"use client";

import { SunMoon } from "lucide-react";
import { useEffect } from "react";

export function ThemeToggle() {
  useEffect(() => {
    const stored = localStorage.getItem("netmee-theme");
    const enabled = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = enabled ? "dark" : "light";
  }, []);

  function toggleTheme() {
    const next = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("netmee-theme", next ? "dark" : "light");
  }

  return <button aria-label="Cambiar tema de color" className="glass-control grid size-9 place-items-center rounded-xl" onClick={toggleTheme} title="Cambiar tema" type="button"><SunMoon aria-hidden="true" size={17} /></button>;
}
