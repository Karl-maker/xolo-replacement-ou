// Runs bin.ts as a real child process, exactly like a user's shell would.
// Keep these few: they are slower, and only prove what a real process can.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const binPath = fileURLToPath(new URL("../src/bin.ts", import.meta.url));

function oum(args: string[]) {
  return spawnSync(process.execPath, ["--import", "tsx", binPath, ...args], {
    cwd: packageRoot,
    encoding: "utf8",
  });
}

describe("bin.ts (real process)", () => {
  it("--version: prints a version on stdout, nothing on stderr, exit 0", () => {
    const r = oum(["--version"]);

    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^\d+\.\d+\.\d+/);
    expect(r.stderr).toBe("");
  });

  it("unknown command: nothing on stdout, message on stderr, exit 2", () => {
    const r = oum(["definitely-not-a-command"]);

    expect(r.status).toBe(2);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("unknown command");
  });

  it("no arguments: shows help, exit 0", () => {
    const r = oum([]);

    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Usage:");
  });
});