ALTER TABLE "ai_analysis"
ADD COLUMN "predicted_compliant" BOOLEAN,
ADD COLUMN "needs_review" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "ai_analysis_needs_review_created_at_idx"
ON "ai_analysis"("needs_review", "created_at");
