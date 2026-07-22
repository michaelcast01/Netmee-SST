import type { LucideIcon } from "lucide-react";

export function PageHeader({ eyebrow, title, description, icon: Icon, action }: { eyebrow: string; title: string; description: string; icon: LucideIcon; action?: React.ReactNode }) {
  return (
    <div className="page-heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="flex items-start gap-4">
        <span className="page-icon grid size-12 shrink-0 place-items-center rounded-2xl" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
        <div><p className="eyebrow text-xs font-semibold text-[var(--brand)]">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p></div>
      </div>
      {action}
    </div>
  );
}
