import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Provisum E2E tests.
 *
 * Dev:  workers=1 (serial), reuse existing server, html reporter
 * CI:   workers=3 (parallel), fresh server per shard, list+html reporters
 *
 * To run a specific spec:
 *   pnpm playwright test e2e/workstream.spec.ts
 *
 * To run with UI mode (great for debugging):
 *   pnpm playwright test --ui
 *
 * To shard in CI (GitHub Actions matrix):
 *   pnpm playwright test --shard=1/3
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",

  // Serial in dev to avoid port/state contention; parallel in CI for speed
  fullyParallel: !!process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 3 : 1,

  // In CI emit both list (for log streaming) and html (for artifact upload)
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : "html",

  timeout: 120_000,

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: process.env.BASE_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
