-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PPE_EXPIRING', 'INSPECTION_PENDING', 'CORRECTIVE_ACTION_OVERDUE', 'CRITICAL_FINDING');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APROBADA', 'RECHAZADA');

-- AlterTable
ALTER TABLE "evidence" ADD COLUMN     "legal_hold" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "inspection_approvals" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "signer_name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "signature_hash" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inspection_approvals_inspection_id_signed_at_idx" ON "inspection_approvals"("inspection_id", "signed_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "inspection_approvals" ADD CONSTRAINT "inspection_approvals_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_approvals" ADD CONSTRAINT "inspection_approvals_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Supabase Data API hardening
ALTER TABLE "inspection_approvals" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "inspection_approvals" FROM anon, authenticated;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "notifications" FROM anon, authenticated;
