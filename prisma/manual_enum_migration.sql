-- Manual migration to safely rename enum values to Spanish.
-- Run this on a PostgreSQL database AFTER taking a full backup.
-- Adjust schema/table names if your DB schema differs.

BEGIN;

-- 1) InspectionStatus
CREATE TYPE "InspectionStatus_new" AS ENUM (
  'BORRADOR',
  'EN_PROGRESO',
  'CORRECCION_PENDIENTE',
  'PENDIENTE_REVISION',
  'APROBADA',
  'RECHAZADA',
  'CANCELADA'
);

ALTER TABLE "inspections" ALTER COLUMN "status" TYPE "InspectionStatus_new" USING (
  CASE "status"
    WHEN 'DRAFT' THEN 'BORRADOR'
    WHEN 'IN_PROGRESS' THEN 'EN_PROGRESO'
    WHEN 'PENDING_CORRECTION' THEN 'CORRECCION_PENDIENTE'
    WHEN 'PENDING_REVIEW' THEN 'PENDIENTE_REVISION'
    WHEN 'APPROVED' THEN 'APROBADA'
    WHEN 'REJECTED' THEN 'RECHAZADA'
    WHEN 'CANCELLED' THEN 'CANCELADA'
    ELSE "status"
  END
);

ALTER TABLE "inspection_status_history" ALTER COLUMN "from_status" TYPE "InspectionStatus_new" USING (
  CASE "from_status"
    WHEN 'DRAFT' THEN 'BORRADOR'
    WHEN 'IN_PROGRESS' THEN 'EN_PROGRESO'
    WHEN 'PENDING_CORRECTION' THEN 'CORRECCION_PENDIENTE'
    WHEN 'PENDING_REVIEW' THEN 'PENDIENTE_REVISION'
    WHEN 'APPROVED' THEN 'APROBADA'
    WHEN 'REJECTED' THEN 'RECHAZADA'
    WHEN 'CANCELLED' THEN 'CANCELADA'
    ELSE "from_status"
  END
);

ALTER TABLE "inspection_status_history" ALTER COLUMN "to_status" TYPE "InspectionStatus_new" USING (
  CASE "to_status"
    WHEN 'DRAFT' THEN 'BORRADOR'
    WHEN 'IN_PROGRESS' THEN 'EN_PROGRESO'
    WHEN 'PENDING_CORRECTION' THEN 'CORRECCION_PENDIENTE'
    WHEN 'PENDING_REVIEW' THEN 'PENDIENTE_REVISION'
    WHEN 'APPROVED' THEN 'APROBADA'
    WHEN 'REJECTED' THEN 'RECHAZADA'
    WHEN 'CANCELLED' THEN 'CANCELADA'
    ELSE "to_status"
  END
);

-- Replace default on inspections.status if exists
ALTER TABLE "inspections" ALTER COLUMN "status" SET DEFAULT 'BORRADOR';

-- Drop old type and rename
DROP TYPE IF EXISTS "InspectionStatus";
ALTER TYPE "InspectionStatus_new" RENAME TO "InspectionStatus";

-- 2) PpeItemStatus
CREATE TYPE "PpeItemStatus_new" AS ENUM (
  'DISPONIBLE',
  'ASIGNADO',
  'MANTENIMIENTO',
  'DANADO',
  'VENCIDO',
  'PERDIDO',
  'RETIRADO'
);

ALTER TABLE "ppe_items" ALTER COLUMN "status" TYPE "PpeItemStatus_new" USING (
  CASE "status"
    WHEN 'AVAILABLE' THEN 'DISPONIBLE'
    WHEN 'ASSIGNED' THEN 'ASIGNADO'
    WHEN 'MAINTENANCE' THEN 'MANTENIMIENTO'
    WHEN 'DAMAGED' THEN 'DANADO'
    WHEN 'EXPIRED' THEN 'VENCIDO'
    WHEN 'LOST' THEN 'PERDIDO'
    WHEN 'RETIRED' THEN 'RETIRADO'
    ELSE "status"
  END
);

-- Update default
ALTER TABLE "ppe_items" ALTER COLUMN "status" SET DEFAULT 'DISPONIBLE';

DROP TYPE IF EXISTS "PpeItemStatus";
ALTER TYPE "PpeItemStatus_new" RENAME TO "PpeItemStatus";

-- 3) ApprovalDecision
CREATE TYPE "ApprovalDecision_new" AS ENUM ('APROBADA','RECHAZADA');

ALTER TABLE "inspection_approvals" ALTER COLUMN "decision" TYPE "ApprovalDecision_new" USING (
  CASE "decision"
    WHEN 'APPROVED' THEN 'APROBADA'
    WHEN 'REJECTED' THEN 'RECHAZADA'
    ELSE "decision"
  END
);

DROP TYPE IF EXISTS "ApprovalDecision";
ALTER TYPE "ApprovalDecision_new" RENAME TO "ApprovalDecision";

COMMIT;

-- NOTES:
-- 1) Run this during a maintenance window. Test on a staging DB first.
-- 2) If you have foreign code or integrations that write the old literal values, update them to the new values.
-- 3) If there are additional tables referencing the enums, include them above.
-- 4) Keep a DB backup and be prepared to restore if needed.
