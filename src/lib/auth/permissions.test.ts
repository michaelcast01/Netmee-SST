import { describe, expect, it } from "vitest";

import { hasPermission, rolePermissions } from "./permissions";

describe("RBAC", () => {
  it("permite al administrador gestionar usuarios", () => {
    expect(hasPermission(rolePermissions.SYSTEM_ADMIN, "user.manage")).toBe(true);
  });

  it("impide al técnico gestionar usuarios", () => {
    expect(hasPermission(rolePermissions.TECHNICIAN, "user.manage")).toBe(false);
  });
});
