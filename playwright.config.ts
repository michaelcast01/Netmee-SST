import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100";
const serverCommand = process.env.PLAYWRIGHT_SERVER_COMMAND ?? "npm run dev -- --port 3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      channel: process.env.CI ? undefined : "chrome",
    },
  }],
  webServer: {
    command: serverCommand,
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      BETTER_AUTH_URL: baseURL,
      E2E_STORAGE_MEMORY: "true",
    },
  },
});
