export type ExpiredEvidence = { id: string; storagePath: string; inspectionId: string };

export type RetentionDependencies = {
  claim(evidence: ExpiredEvidence): Promise<boolean>;
  deleteObject(storagePath: string): Promise<void>;
  finalize(evidence: ExpiredEvidence): Promise<void>;
  markFailure(evidenceId: string, message: string): Promise<void>;
};

export async function processExpiredEvidence(evidence: ExpiredEvidence, dependencies: RetentionDependencies) {
  if (!await dependencies.claim(evidence)) return { status: "skipped" as const };
  try {
    // Object deletion must be idempotent: a retry repeats it when finalization failed.
    await dependencies.deleteObject(evidence.storagePath);
    await dependencies.finalize(evidence);
    return { status: "deleted" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Error desconocido";
    await dependencies.markFailure(evidence.id, message);
    return { status: "failed" as const, message };
  }
}
