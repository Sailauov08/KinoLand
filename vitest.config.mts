import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // `server-only` throws outside the React server condition; it's a no-op in unit tests.
      "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    // Every test file gets its own in-memory Postgres (PGlite); no external database is touched.
    env: { EMBEDDED_DB_DIR: "memory", APP_TIMEZONE: "Asia/Almaty" },
    testTimeout: 20_000,
    include: ["tests/**/*.test.ts"],
  },
});
