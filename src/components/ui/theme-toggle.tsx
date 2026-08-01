"use client";

import { SunMoon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

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

  return (
    <Button
      aria-label="Cambiar tema de color"
      className="glass-control text-violet-100 hover:bg-white/12 hover:text-white"
      onClick={toggleTheme}
      size="icon-lg"
      title="Cambiar tema"
      type="button"
      variant="ghost"
    >
      <SunMoon aria-hidden="true" />
    </Button>
  );
}
