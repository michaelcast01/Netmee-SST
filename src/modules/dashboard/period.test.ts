import { describe, expect, it } from "vitest";

import { getDashboardPeriodBounds, parseDashboardPeriod, percentage, trendPercentage } from "./period";

describe("dashboard period helpers", () => {
  it("accepts supported periods and falls back safely", () => {
    expect(parseDashboardPeriod("7d")).toBe("7d");
    expect(parseDashboardPeriod(["90d", "7d"])).toBe("90d");
    expect(parseDashboardPeriod("invalid")).toBe("30d");
  });

  it("builds adjacent comparison windows", () => {
    const now = new Date("2026-07-24T12:00:00.000Z");
    const bounds = getDashboardPeriodBounds("7d", now);
    expect(bounds.currentStart.toISOString()).toBe("2026-07-17T12:00:00.000Z");
    expect(bounds.previousStart.toISOString()).toBe("2026-07-10T12:00:00.000Z");
  });

  it("distinguishes missing data from a real zero percent", () => {
    expect(percentage(0, 0)).toBeNull();
    expect(percentage(0, 4)).toBe(0);
    expect(percentage(3, 4)).toBe(75);
  });

  it("calculates trends without inventing a baseline", () => {
    expect(trendPercentage(12, 10)).toBe(20);
    expect(trendPercentage(0, 0)).toBe(0);
    expect(trendPercentage(2, 0)).toBeNull();
  });
});
