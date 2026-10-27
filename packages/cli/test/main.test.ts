import { describe, expect, it } from "vitest";
import { main } from "../src/main.js";
import { testDeps } from "./helpers.js";

describe("main()", () => {
  it("prints the version to stdout and exits 0", async () => {
    const t = testDeps();

    expect(await main(["--version"], t.deps)).toBe(0);
    expect(t.stdout()).toBe("0.0.0-test\n");
    expect(t.stderr()).toBe("");
  });

  it("shows generated help, listing every command, when called with no arguments", async () => {
    const t = testDeps();

    expect(await main([], t.deps)).toBe(0);
    expect(t.stdout()).toContain("Usage:");
    expect(t.stdout()).toContain("company add");
    expect(t.stdout()).toContain("Exit codes:");
    expect(t.stderr()).toBe("");
  });

  it("treats an unknown command as a usage error: stderr only, exit 2", async () => {
    const t = testDeps();

    expect(await main(["nope"], t.deps)).toBe(2);
    expect(t.stdout()).toBe("");
    expect(t.stderr()).toContain('unknown command "nope"');
  });

  it("never touches the database for help or version", async () => {
    const t = testDeps();
    t.deps.core = () => {
      throw new Error("the database must not be opened");
    };

    expect(await main(["--help"], t.deps)).toBe(0);
    expect(await main(["--version"], t.deps)).toBe(0);
  });
});
