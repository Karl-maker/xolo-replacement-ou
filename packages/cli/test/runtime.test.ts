import { describe, expect, it } from "vitest";
import { createRuntime } from "../src/runtime.js";
import { testDeps } from "./helpers.js";

const make = (env: Record<string, string>) =>
  createRuntime({
    env,
    version: "1.0.0",
    io: testDeps().deps.io,
    configPath: "/nonexistent/config.json",
  });

describe("createRuntime", () => {
  it("builds the dependencies without opening a database", () => {
    const runtime = make({});

    expect(runtime.deps.version).toBe("1.0.0");
  });

  it("closing a runtime that never opened a database is harmless", async () => {
    await expect(make({}).close()).resolves.toBeUndefined();
  });

  it("fails with a CONFIG error that says how to fix it when DATABASE_URL is missing", () => {
    const runtime = make({});

    expect(() => runtime.deps.core()).toThrowError(
      expect.objectContaining({
        info: expect.objectContaining({
          code: "CONFIG",
          hint: expect.stringContaining("DATABASE_URL"),
        }),
      }),
    );
  });

  it("opens the database lazily, once, and can close it", async () => {
    const runtime = make({
      DATABASE_URL: "postgresql://user:pw@localhost:1/none",
    }); // never connected to

    const first = runtime.deps.core();

    expect(runtime.deps.core()).toBe(first);
    await expect(runtime.close()).resolves.toBeUndefined();
  });
});
