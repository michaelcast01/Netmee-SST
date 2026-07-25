import { describe, expect, it } from "vitest";

import { CSV_DEFAULT_LIMIT, CSV_MAX_LIMIT, csvCell, parseInspectionCsvFilters } from "./inspection-csv";

describe("inspection CSV helpers", () => {
  it("escapes quotes and neutralizes spreadsheet formulas", () => {
    expect(csvCell('Equipo "A"')).toBe('"Equipo ""A"""');
    expect(csvCell("=HYPERLINK(\"bad\")")).toBe('"\'=HYPERLINK(""bad"")"');
  });

  it("validates filters and caps export size", () => {
    const filters = parseInspectionCsvFilters(new URLSearchParams("status=APROBADA&from=2026-07-01&to=2026-07-24&limit=999999"));
    expect(filters.status).toBe("APROBADA");
    expect(filters.limit).toBe(CSV_MAX_LIMIT);
    expect(filters.createdAt?.gte?.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("uses safe defaults for malformed values", () => {
    const filters = parseInspectionCsvFilters(new URLSearchParams("status=NOPE&from=yesterday&limit=nope"));
    expect(filters.status).toBeUndefined();
    expect(filters.createdAt).toBeUndefined();
    expect(filters.limit).toBe(CSV_DEFAULT_LIMIT);
  });
});
