import "dotenv/config"; // loads packages/db/.env so DATABASE_URL is available to the tests
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // These tests share one real database, so run the files one after another.
    fileParallelism: false,
    testTimeout: 15_000,
  },
});
