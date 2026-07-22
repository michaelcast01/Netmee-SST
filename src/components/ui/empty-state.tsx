import type { LucideIcon } from "lucide-react";
import Image from "next/image";

export function EmptyState({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <div className="empty-state surface-card flex flex-col items-center rounded-3xl px-6 py-8 text-center">
      <div className="relative size-40 overflow-hidden rounded-3xl"><Image alt="Elementos de protección personal protegidos por análisis digital" fill sizes="160px" src="/brand/netmee-empty-state.png" /></div>
      <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--brand-strong)]"><Icon aria-hidden="true" size={15} /> Todo al día</span>
      <h2 className="mt-4 text-lg font-semibold text-[var(--plum)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}
