import { defineConfig, devices } from "@playwright/test";

/** End-to-end tests run against a production build in mock mode (no keys, no database), like CI. */
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, ...devices["Pixel 5"], viewport: { width: 360, height: 640 } },
  projects: [{ name: "phone", use: { browserName: "chromium" } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    env: { USE_MOCKS: "1", SESSION_SECRET: "e2e-only-not-a-secret-e2e-only-not-a-secret", DEMO_PIN: "1234" },
  },
});
