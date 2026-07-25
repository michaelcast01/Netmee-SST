import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const db = {
  ppeItem: { findMany: vi.fn() },
  inspection: { findMany: vi.fn() },
  correctiveAction: { findMany: vi.fn() },
  incident: { findMany: vi.fn() },
  notification: { upsert: vi.fn((args) => args) },
  $transaction: vi.fn(),
};

vi.mock("@/lib/db/prisma", () => ({ getPrisma: () => db }));

import { syncNotificationsForUser } from "./service";

describe("syncNotificationsForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.ppeItem.findMany.mockResolvedValue([]);
    db.inspection.findMany.mockResolvedValue([]);
    db.correctiveAction.findMany.mockResolvedValue([]);
    db.incident.findMany.mockResolvedValue([]);
    db.$transaction.mockResolvedValue([]);
  });

  it("creates deduplicated overdue notifications for the responsible user", async () => {
    db.correctiveAction.findMany.mockResolvedValue([{
      id: "action-1",
      dueAt: new Date("2026-07-01T00:00:00.000Z"),
      incident: { code: "INC-001" },
    }]);
    await syncNotificationsForUser({
      id: "user-1",
      name: "Técnico",
      email: "tech@example.com",
      roles: ["TECHNICIAN"],
      permissions: [],
    });
    expect(db.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_dedupeKey: { userId: "user-1", dedupeKey: "action-overdue:action-1" } },
    }));
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it("collects inventory, review and critical alerts only with the required permissions", async () => {
    db.ppeItem.findMany.mockResolvedValue([{ id: "ppe-1", qrCode: "QR-001", expiresAt: new Date("2026-08-01"), ppeType: { name: "Casco" } }]);
    db.inspection.findMany.mockResolvedValue([{ id: "inspection-1", code: "INS-001" }]);
    db.incident.findMany.mockResolvedValue([{ id: "incident-1", code: "INC-001", title: "Caída potencial" }]);
    await syncNotificationsForUser({
      id: "sst-1",
      name: "Responsable SST",
      email: "sst@example.com",
      roles: ["SST_MANAGER"],
      permissions: ["inventory.update", "inspection.review", "corrective_action.manage"],
    });
    expect(db.notification.upsert).toHaveBeenCalledTimes(3);
    expect(db.notification.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_dedupeKey: { userId: "sst-1", dedupeKey: "critical:incident-1" } },
    }));
  });
});
