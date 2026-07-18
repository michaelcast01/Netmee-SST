import { describe, expect, it } from "vitest";

import { resolveAuthOrigins } from "./origins";

describe("resolveAuthOrigins", () => {
  it("mantiene localhost durante desarrollo", () => {
    expect(resolveAuthOrigins({ BETTER_AUTH_URL: "http://localhost:3000" })).toEqual({
      baseURL: "http://localhost:3000",
      trustedOrigins: ["http://localhost:3000"],
    });
  });

  it("ignora un BETTER_AUTH_URL local dentro de Vercel", () => {
    const result = resolveAuthOrigins({
      VERCEL: "1",
      BETTER_AUTH_URL: "http://localhost:3000",
      VERCEL_PROJECT_PRODUCTION_URL: "netmee-sst.vercel.app",
      VERCEL_URL: "netmee-sst-git-main-example.vercel.app",
    });

    expect(result.baseURL).toBe("https://netmee-sst.vercel.app");
    expect(result.trustedOrigins).toContain("https://netmee-sst.vercel.app");
    expect(result.trustedOrigins).toContain(
      "https://netmee-sst-git-main-example.vercel.app",
    );
    expect(result.trustedOrigins).not.toContain("http://localhost:3000");
  });

  it("acepta orígenes adicionales configurados explícitamente", () => {
    const result = resolveAuthOrigins({
      VERCEL: "1",
      BETTER_AUTH_TRUSTED_ORIGINS: "https://sst.netmee.co, invalid url",
    });

    expect(result.trustedOrigins).toContain("https://sst.netmee.co");
  });
});
