const labels: Record<string, string> = {
  SYSTEM_ADMIN: "Administrador del sistema",
  TECHNICIAN: "Técnico",
  SST_MANAGER: "Responsable SST",
  OPERATIONS_COORDINATOR: "Coordinador de operaciones",
  MANAGEMENT: "Gerencia",
  SUPERVISOR: "Supervisor",
  INSPECTOR: "Inspector",
  AUDITOR: "Auditor",
  WORKER: "Trabajador",
  DRAFT: "Borrador",
  IN_PROGRESS: "En progreso",
  PENDING_CORRECTION: "Pendiente de corrección",
  PENDING_REVIEW: "Pendiente de revisión",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
  AVAILABLE: "Disponible",
  ASSIGNED: "Asignado",
  MAINTENANCE: "En mantenimiento",
  DAMAGED: "Dañado",
  EXPIRED: "Vencido",
  LOST: "Perdido",
  RETIRED: "Retirado",
  OPEN: "Abierta",
  COMPLETED: "Completada",
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export function displayLabel(value: string) {
  return (
    labels[value] ??
    value
      .replaceAll("_", " ")
      .toLocaleLowerCase("es-CO")
      .replace(/^./, (letter) => letter.toLocaleUpperCase("es-CO"))
  );
}

const auditLabels: Record<string, string> = {
  "admin.password.changed": "Contraseña del administrador actualizada",
  "inspection.review.requested": "Revisión de inspección solicitada",
  "inspection.approved": "Inspección aprobada",
  "inspection.rejected": "Inspección rechazada",
  "evidence.uploaded": "Evidencia adjuntada",
  "evidence.legal_hold.enabled": "Retención legal activada",
  "evidence.legal_hold.disabled": "Retención legal desactivada",
  "evidence.retention.deleted": "Evidencia eliminada por retención",
  "user.role.assigned": "Rol asignado al usuario",
  "incident.created": "Novedad creada",
  "corrective_action.created": "Acción correctiva creada",
  "corrective_action.completed": "Acción correctiva completada",
  "inventory.item.created": "Elemento de inventario creado",
  "inventory.item.assigned": "Elemento de inventario asignado",
  "inventory.item.returned": "Elemento de inventario devuelto",
  inspection: "Inspección",
  evidence: "Evidencia",
  user: "Usuario",
  incident: "Novedad",
  corrective_action: "Acción correctiva",
  ppe_item: "Elemento EPP",
};

export function auditLabel(value: string) {
  return auditLabels[value] ?? displayLabel(value.replaceAll(".", "_"));
}
