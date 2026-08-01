import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function PageHeader({ eyebrow, title, description, icon: Icon, action }: { eyebrow: string; title: string; description: string; icon: LucideIcon; action?: React.ReactNode }) {
  return (
    <div className="page-heading flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="flex items-start gap-4">
        <span className="page-icon grid size-12 shrink-0 place-items-center rounded-2xl" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
            <Badge className="border-[var(--line)] bg-[var(--brand-soft)] text-[var(--brand-strong)]" variant="outline">{eyebrow}</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}
