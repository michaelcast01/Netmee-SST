export const modules = [
  { slug: "auth", name: "Autenticación y acceso", description: "Sesiones, recuperación, roles y permisos de mínimo privilegio.", state: "ready" },
  { slug: "activities", name: "Actividades y peligros", description: "Matriz de riesgos y requisitos por actividad.", state: "planned" },
  { slug: "ppe", name: "Elementos de protección", description: "Catálogo y reglas de EPP obligatorio.", state: "planned" },
  { slug: "inventory", name: "Inventario", description: "Asignaciones, movimientos, vida útil y reposiciones.", state: "ready" },
  { slug: "inspections", name: "Inspecciones", description: "Listas, respuestas, revisión, estados y trazabilidad.", state: "ready" },
  { slug: "evidence", name: "Evidencias", description: "Metadatos, almacenamiento y retención segura.", state: "ready" },
  { slug: "ai-alerts", name: "Alertas de IA", description: "Análisis preventivo desacoplado con validación humana.", state: "ready" },
  { slug: "incidents", name: "Novedades", description: "Hallazgos, severidad y responsables.", state: "ready" },
  { slug: "corrective-actions", name: "Acciones correctivas", description: "Compromisos, vencimientos y cierres.", state: "ready" },
  { slug: "reports", name: "Reportes", description: "Cumplimiento, inventario y desempeño preventivo.", state: "ready" },
  { slug: "notifications", name: "Notificaciones", description: "Avisos desacoplados por eventos del dominio.", state: "planned" },
  { slug: "audit", name: "Auditoría", description: "Registro consultable de operaciones sensibles.", state: "ready" },
] as const;
