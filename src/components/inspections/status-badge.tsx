import type { InspectionStatus } from "@/modules/inspections";
import { inspectionStatusLabels as labels } from "@/modules/inspections";

const tones: Record<InspectionStatus, string> = {
  BORRADOR: "bg-slate-100 text-slate-700",
  EN_PROGRESO: "bg-blue-50 text-blue-700",
  CORRECCION_PENDIENTE: "bg-amber-50 text-amber-700",
  PENDIENTE_REVISION: "bg-violet-50 text-violet-700",
  APROBADA: "bg-emerald-50 text-emerald-700",
  RECHAZADA: "bg-red-50 text-red-700",
  CANCELADA: "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: InspectionStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[status]}`}>{labels[status]}</span>;
}
