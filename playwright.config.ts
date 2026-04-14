import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT || "3000");
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${port}`;
const isIntegrationHarness =
  process.env.PLAYWRIGHT_LOCAL_COUNCIL_INTEGRATION === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI && !isIntegrationHarness,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
