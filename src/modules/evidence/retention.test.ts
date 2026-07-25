import { describe, expect, it, vi } from "vitest";

import { processExpiredEvidence, type RetentionDependencies } from "./retention";

const evidence = { id: "ev-1", storagePath: "evidence/ev-1.jpg", inspectionId: "inspection-1" };

describe("processExpiredEvidence", () => {
  it("skips evidence that another worker or a legal hold already claimed", async () => {
    const dependencies = {
      claim: vi.fn().mockResolvedValue(false),
      deleteObject: vi.fn(),
      finalize: vi.fn(),
      markFailure: vi.fn(),
    } satisfies RetentionDependencies;
    expect(await processExpiredEvidence(evidence, dependencies)).toEqual({ status: "skipped" });
    expect(dependencies.deleteObject).not.toHaveBeenCalled();
  });

  it("repeats idempotent object deletion when database finalization failed", async () => {
    const dependencies = {
      claim: vi.fn().mockResolvedValue(true),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      finalize: vi.fn().mockRejectedValueOnce(new Error("database unavailable")).mockResolvedValueOnce(undefined),
      markFailure: vi.fn().mockResolvedValue(undefined),
    } satisfies RetentionDependencies;

    expect((await processExpiredEvidence(evidence, dependencies)).status).toBe("failed");
    expect((await processExpiredEvidence(evidence, dependencies)).status).toBe("deleted");
    expect(dependencies.deleteObject).toHaveBeenCalledTimes(2);
    expect(dependencies.markFailure).toHaveBeenCalledWith("ev-1", "database unavailable");
  });
});
