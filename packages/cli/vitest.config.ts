import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Tests that spawn the real binary can take a moment on a cold start.
    testTimeout: 15_000,
  },
});