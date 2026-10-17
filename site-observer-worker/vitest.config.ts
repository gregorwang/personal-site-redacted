import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const projectDirectory = path.dirname(
        fileURLToPath(import.meta.url),
      );
      const migrationsPath = path.join(projectDirectory, "migrations");
      const migrations = await readD1Migrations(migrationsPath);
      return {
        main: "./src/index.ts",
        miniflare: {
          compatibilityDate: "2026-07-24",
          d1Databases: ["DB"],
          bindings: {
            TEST_MIGRATIONS: migrations,
            CLOUDFLARE_ACCOUNT_ID: "test-account",
            TARGET_WORKER_NAME: "my-remix-worker",
            TARGET_ENVIRONMENT: "test",
            DELIVERY_ENABLED: "false",
            AI_ENABLED: "false",
            LOOKBACK_MINUTES: "10",
            RECOVERY_MINUTES: "30",
            QUERY_EVENT_LIMIT: "100",
            DAILY_HEARTBEAT_HOUR_JST: "9",
          },
        },
      };
    }),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
