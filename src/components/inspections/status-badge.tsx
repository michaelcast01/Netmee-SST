import type { InspectionStatus } from "@/modules/inspections";

const labels: Record<InspectionStatus, string> = {
  DRAFT: "Borrador",
  IN_PROGRESS: "En progreso",
  PENDING_CORRECTION: "Corrección pendiente",
  PENDING_REVIEW: "Pendiente de revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

const tones: Record<InspectionStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  PENDING_CORRECTION: "bg-amber-50 text-amber-700",
  PENDING_REVIEW: "bg-violet-50 text-violet-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: InspectionStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[status]}`}>{labels[status]}</span>;
}
