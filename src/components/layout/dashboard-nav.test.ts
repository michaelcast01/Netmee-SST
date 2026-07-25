import { describe, expect, it } from "vitest";

import { buildDashboardLinks } from "./dashboard-nav";

describe("buildDashboardLinks", () => {
  it("keeps the minimum navigation available to every authenticated user", () => {
    expect(buildDashboardLinks({
      inspectionReview: false,
      inventoryView: false,
      incidentCreate: false,
      reportExport: false,
      userManage: false,
      auditView: false,
    })).toEqual([
      { href: "/dashboard", label: "Inicio" },
      { href: "/inspecciones", label: "Inspecciones" },
    ]);
  });

  it("groups privileged administration links without hiding operational permissions", () => {
    const links = buildDashboardLinks({
      inspectionReview: true,
      inventoryView: true,
      incidentCreate: true,
      reportExport: true,
      userManage: true,
      auditView: true,
    });
    expect(links.find((link) => link.href === "/validaciones-ia")).toBeDefined();
    expect(links.filter((link) => link.group === "administration").map((link) => link.label)).toEqual(["Usuarios", "Auditoría"]);
  });
});
