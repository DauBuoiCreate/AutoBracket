import { defineConfig, devices } from "@playwright/test";

const isCi = process.env.CI === "true";

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  failOnFlakyTests: isCi,
  forbidOnly: isCi,
  fullyParallel: false,
  outputDir: "test-results/playwright",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  reporter: isCi ? [["line"], ["html", { open: "never" }]] : "line",
  retries: isCi ? 1 : 0,
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "corepack pnpm --filter @autobracket/web start",
    reuseExistingServer: !isCi,
    stderr: "pipe",
    stdout: "pipe",
    timeout: 120_000,
    url: "http://127.0.0.1:3000/api/health",
  },
  workers: 1,
});
