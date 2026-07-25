CREATE TYPE "AiComplianceDecision" AS ENUM ('CUMPLE', 'NO_CUMPLE', 'NO_CONCLUYENTE');

ALTER TABLE "ppe_items"
  ADD COLUMN "image_storage_path" TEXT,
  ADD COLUMN "image_file_name" TEXT,
  ADD COLUMN "image_mime_type" TEXT,
  ADD COLUMN "image_file_size" INTEGER,
  ADD COLUMN "image_checksum" TEXT;

ALTER TABLE "ai_validations"
  ADD COLUMN "decision" "AiComplianceDecision";

UPDATE "ai_validations" AS validation
SET "decision" = CASE
  WHEN validation."confirmed" = TRUE AND analysis."predicted_compliant" = TRUE
    THEN 'CUMPLE'::"AiComplianceDecision"
  WHEN validation."confirmed" = TRUE AND analysis."predicted_compliant" = FALSE
    THEN 'NO_CUMPLE'::"AiComplianceDecision"
  ELSE 'NO_CONCLUYENTE'::"AiComplianceDecision"
END
FROM "ai_analysis" AS analysis
WHERE analysis."id" = validation."analysis_id";

UPDATE "ai_validations"
SET "decision" = 'NO_CONCLUYENTE'::"AiComplianceDecision"
WHERE "decision" IS NULL;

ALTER TABLE "ai_validations"
  ALTER COLUMN "decision" SET NOT NULL;
