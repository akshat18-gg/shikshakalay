import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // "server-only" throws outside Next.js; in unit tests it is an empty module.
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // Unit tests never call paid APIs; logs stay quiet. The secret and PIN are test-only values.
    env: { USE_MOCKS: "1", LOG_SILENT: "1", SESSION_SECRET: "test-only-secret-test-only-secret-1234", DEMO_PIN: "1234" },
  },
});
