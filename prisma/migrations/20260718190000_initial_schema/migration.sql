-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('TECHNICIAN', 'SST_MANAGER', 'OPERATIONS_COORDINATOR', 'SYSTEM_ADMIN', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'PENDING_CORRECTION', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PpeItemStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DAMAGED', 'EXPIRED', 'LOST', 'RETIRED');

-- CreateEnum
CREATE TYPE "PpeAssignmentStatus" AS ENUM ('ACTIVE', 'RETURNED', 'LOST', 'REPLACED');

-- CreateEnum
CREATE TYPE "PpeMovementType" AS ENUM ('PURCHASE', 'DELIVERY', 'RETURN', 'REPLACEMENT', 'DAMAGE', 'LOSS', 'RETIREMENT');

-- CreateEnum
CREATE TYPE "AiAnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'DETECTED', 'NOT_DETECTED', 'LOW_CONFIDENCE', 'CONFIRMED', 'DISCARDED', 'ERROR');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CorrectiveActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_VERIFICATION', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AiJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "last_request" BIGINT NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hazards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "hazards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_hazards" (
    "activity_id" TEXT NOT NULL,
    "hazard_id" TEXT NOT NULL,

    CONSTRAINT "activity_hazards_pkey" PRIMARY KEY ("activity_id","hazard_id")
);

-- CreateTable
CREATE TABLE "ppe_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "useful_life_days" INTEGER,

    CONSTRAINT "ppe_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_ppe_requirements" (
    "activity_id" TEXT NOT NULL,
    "ppe_type_id" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "activity_ppe_requirements_pkey" PRIMARY KEY ("activity_id","ppe_type_id")
);

-- CreateTable
CREATE TABLE "ppe_items" (
    "id" TEXT NOT NULL,
    "serial_number" TEXT,
    "qr_code" TEXT NOT NULL,
    "ppe_type_id" TEXT NOT NULL,
    "status" "PpeItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "size" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ppe_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ppe_assignments" (
    "id" TEXT NOT NULL,
    "ppe_item_id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "status" "PpeAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "delivered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_at" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ppe_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ppe_movements" (
    "id" TEXT NOT NULL,
    "ppe_item_id" TEXT NOT NULL,
    "type" "PpeMovementType" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ppe_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "general_observation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "inspection_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "reported_by_id" TEXT NOT NULL,
    "responsible_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_actions" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CorrectiveActionStatus" NOT NULL DEFAULT 'OPEN',
    "responsible_id" TEXT NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "closure_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corrective_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_status_history" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "from_status" "InspectionStatus",
    "to_status" "InspectionStatus" NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_items" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "ppe_type_id" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "compliant" BOOLEAN,
    "observation" TEXT,

    CONSTRAINT "inspection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "retention_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis" (
    "id" TEXT NOT NULL,
    "evidence_id" TEXT NOT NULL,
    "status" "AiAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "confidence" DECIMAL(5,4),
    "result" JSONB,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis_jobs" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "status" "AiJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_analysis_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_validations" (
    "id" TEXT NOT NULL,
    "analysis_id" TEXT NOT NULL,
    "validated_by_id" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_key_key" ON "rate_limits"("key");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "activities_name_key" ON "activities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hazards_name_key" ON "hazards"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ppe_types_code_key" ON "ppe_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ppe_items_serial_number_key" ON "ppe_items"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "ppe_items_qr_code_key" ON "ppe_items"("qr_code");

-- CreateIndex
CREATE INDEX "ppe_items_status_expires_at_idx" ON "ppe_items"("status", "expires_at");

-- CreateIndex
CREATE INDEX "ppe_assignments_worker_id_status_idx" ON "ppe_assignments"("worker_id", "status");

-- CreateIndex
CREATE INDEX "ppe_assignments_ppe_item_id_status_idx" ON "ppe_assignments"("ppe_item_id", "status");

-- CreateIndex
CREATE INDEX "ppe_movements_ppe_item_id_created_at_idx" ON "ppe_movements"("ppe_item_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_code_key" ON "inspections"("code");

-- CreateIndex
CREATE INDEX "inspections_worker_id_status_idx" ON "inspections"("worker_id", "status");

-- CreateIndex
CREATE INDEX "inspections_activity_id_created_at_idx" ON "inspections"("activity_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_code_key" ON "incidents"("code");

-- CreateIndex
CREATE INDEX "incidents_status_severity_created_at_idx" ON "incidents"("status", "severity", "created_at");

-- CreateIndex
CREATE INDEX "corrective_actions_status_due_at_idx" ON "corrective_actions"("status", "due_at");

-- CreateIndex
CREATE INDEX "inspection_status_history_inspection_id_created_at_idx" ON "inspection_status_history"("inspection_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_items_inspection_id_ppe_type_id_key" ON "inspection_items"("inspection_id", "ppe_type_id");

-- CreateIndex
CREATE INDEX "evidence_inspection_id_created_at_idx" ON "evidence"("inspection_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_analysis_status_created_at_idx" ON "ai_analysis"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_jobs_analysis_id_key" ON "ai_analysis_jobs"("analysis_id");

-- CreateIndex
CREATE INDEX "ai_analysis_jobs_status_run_after_idx" ON "ai_analysis_jobs"("status", "run_after");

-- CreateIndex
CREATE INDEX "ai_validations_analysis_id_created_at_idx" ON "ai_validations"("analysis_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_hazards" ADD CONSTRAINT "activity_hazards_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_hazards" ADD CONSTRAINT "activity_hazards_hazard_id_fkey" FOREIGN KEY ("hazard_id") REFERENCES "hazards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_ppe_requirements" ADD CONSTRAINT "activity_ppe_requirements_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_ppe_requirements" ADD CONSTRAINT "activity_ppe_requirements_ppe_type_id_fkey" FOREIGN KEY ("ppe_type_id") REFERENCES "ppe_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_items" ADD CONSTRAINT "ppe_items_ppe_type_id_fkey" FOREIGN KEY ("ppe_type_id") REFERENCES "ppe_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_assignments" ADD CONSTRAINT "ppe_assignments_ppe_item_id_fkey" FOREIGN KEY ("ppe_item_id") REFERENCES "ppe_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_assignments" ADD CONSTRAINT "ppe_assignments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_movements" ADD CONSTRAINT "ppe_movements_ppe_item_id_fkey" FOREIGN KEY ("ppe_item_id") REFERENCES "ppe_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ppe_movements" ADD CONSTRAINT "ppe_movements_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_status_history" ADD CONSTRAINT "inspection_status_history_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_status_history" ADD CONSTRAINT "inspection_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_items" ADD CONSTRAINT "inspection_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_items" ADD CONSTRAINT "inspection_items_ppe_type_id_fkey" FOREIGN KEY ("ppe_type_id") REFERENCES "ppe_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis_jobs" ADD CONSTRAINT "ai_analysis_jobs_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "ai_analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_validations" ADD CONSTRAINT "ai_validations_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "ai_analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_validations" ADD CONSTRAINT "ai_validations_validated_by_id_fkey" FOREIGN KEY ("validated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Supabase Data API hardening: application access is server-side through Prisma.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "users" FROM anon, authenticated;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "sessions" FROM anon, authenticated;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "accounts" FROM anon, authenticated;
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "verifications" FROM anon, authenticated;
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "rate_limits" FROM anon, authenticated;
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "roles" FROM anon, authenticated;
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "permissions" FROM anon, authenticated;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "user_roles" FROM anon, authenticated;
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "role_permissions" FROM anon, authenticated;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "activities" FROM anon, authenticated;
ALTER TABLE "hazards" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "hazards" FROM anon, authenticated;
ALTER TABLE "activity_hazards" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "activity_hazards" FROM anon, authenticated;
ALTER TABLE "ppe_types" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ppe_types" FROM anon, authenticated;
ALTER TABLE "activity_ppe_requirements" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "activity_ppe_requirements" FROM anon, authenticated;
ALTER TABLE "ppe_items" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ppe_items" FROM anon, authenticated;
ALTER TABLE "ppe_assignments" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ppe_assignments" FROM anon, authenticated;
ALTER TABLE "ppe_movements" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ppe_movements" FROM anon, authenticated;
ALTER TABLE "inspections" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "inspections" FROM anon, authenticated;
ALTER TABLE "incidents" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "incidents" FROM anon, authenticated;
ALTER TABLE "corrective_actions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "corrective_actions" FROM anon, authenticated;
ALTER TABLE "inspection_status_history" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "inspection_status_history" FROM anon, authenticated;
ALTER TABLE "inspection_items" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "inspection_items" FROM anon, authenticated;
ALTER TABLE "evidence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "evidence" FROM anon, authenticated;
ALTER TABLE "ai_analysis" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ai_analysis" FROM anon, authenticated;
ALTER TABLE "ai_analysis_jobs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ai_analysis_jobs" FROM anon, authenticated;
ALTER TABLE "ai_validations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ai_validations" FROM anon, authenticated;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "audit_logs" FROM anon, authenticated;

