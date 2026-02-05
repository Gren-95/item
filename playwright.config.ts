import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 4,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.BASE_URL || "https://localhost",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    ignoreHTTPSErrors: true, // Accept self-signed certificates
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // In development, assume server is already running (with HTTPS on 443)
  // In CI, start the server without HTTPS
  webServer: process.env.CI
    ? {
        command: "bun run start",
        url: "http://localhost:3000/health",
        reuseExistingServer: false,
        timeout: 120 * 1000,
      }
    : undefined,
});
