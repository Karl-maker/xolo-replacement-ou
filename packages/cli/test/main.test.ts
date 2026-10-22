import { describe, expect, it } from "vitest";
import { main } from "../src/main.js";
import { testDeps } from "./helpers.js";

describe("main()", () => {
  it("prints the version to stdout and exits 0", async () => {
    const t = testDeps({ version: "1.2.3" });
    const code = await main(["--version"], t.deps);

    expect(code).toBe(0);
    expect(t.stdout()).toBe("1.2.3\n");
    expect(t.stderr()).toBe("");
  });

  it("shows help when called with no arguments", async () => {
    const t = testDeps();
    const code = await main([], t.deps);

    expect(code).toBe(0);
    expect(t.stdout()).toContain("Usage:");
    expect(t.stderr()).toBe("");
  });

  it("treats an unknown command as a usage error: stderr only, exit 2", async () => {
    const t = testDeps();
    const code = await main(["nope"], t.deps);

    expect(code).toBe(2);
    expect(t.stdout()).toBe("");
    expect(t.stderr()).toContain('unknown command "nope"');
  });
});