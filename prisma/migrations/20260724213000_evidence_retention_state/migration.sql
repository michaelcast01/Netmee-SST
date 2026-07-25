ALTER TABLE "evidence"
ADD COLUMN "retention_delete_started_at" TIMESTAMP(3),
ADD COLUMN "retention_delete_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "retention_delete_last_error" TEXT;

CREATE INDEX "evidence_retention_cleanup_idx"
ON "evidence"("retention_until", "legal_hold", "retention_delete_started_at");
