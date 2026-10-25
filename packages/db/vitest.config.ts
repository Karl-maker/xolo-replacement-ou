import "dotenv/config"; // loads packages/db/.env (DATABASE_URL and TEST_DATABASE_URL)
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/support/global-setup.ts"], // refuses to start unless it is safe
    setupFiles: ["test/support/setup.ts"], // hides DATABASE_URL from the tests
    // These tests share one real database, so run the files one after another.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
