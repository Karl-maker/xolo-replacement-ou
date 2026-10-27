// End-to-end tests: run bin.ts as a real child process, exactly like a user's shell would.
// Slower than the in-process tests, so keep these few and focused on things only a real
// process can prove (streams, exit codes, real config file, the entry wiring).
// None of them needs a database: that is itself part of what is being proved.
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const binPath = fileURLToPath(new URL("../src/bin.ts", import.meta.url));

let configDir: string;
beforeAll(async () => {
  configDir = await mkdtemp(path.join(tmpdir(), "oum-e2e-"));
});
afterAll(async () => {
  await rm(configDir, { recursive: true, force: true });
});

function oum(args: string[], extraEnv: Record<string, string> = {}) {
  const env: Record<string, string | undefined> = {
    ...process.env,
    OUM_CONFIG: path.join(configDir, "config.json"),
    ...extraEnv,
  };
  for (const name of ["DATABASE_URL", "OUM_USER"])
    if (!(name in extraEnv)) delete env[name];

  // `--import tsx` lets plain Node run TypeScript, so we test the source without building first.
  return spawnSync(process.execPath, ["--import", "tsx", binPath, ...args], {
    cwd: packageRoot,
    encoding: "utf8",
    env: env as NodeJS.ProcessEnv,
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

  it("no arguments: shows help listing the commands, exit 0", () => {
    const r = oum([]);

    expect(r.status).toBe(0);
    expect(r.stdout).toContain("Usage:");
    expect(r.stdout).toContain("company add");
  });

  it("command help: exit 0, no database needed", () => {
    const r = oum(["company", "add", "--help"]);

    expect(r.status).toBe(0);
    expect(r.stdout).toContain("--registry-code");
  });

  it("with nobody selected: exit 4 and a hint, before any database is needed", () => {
    const r = oum(["company", "list"]);

    expect(r.status).toBe(4);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("oum user use");
  });

  it("with a user selected but no database configured: exit 1 and a hint about DATABASE_URL", () => {
    const r = oum(["company", "list"], { OUM_USER: "Someone" });

    expect(r.status).toBe(1);
    expect(r.stderr).toContain("DATABASE_URL");
  });

  it("errors are JSON on stderr with --json, and stdout stays empty", () => {
    const r = oum(["company", "list", "--json"]);

    expect(r.status).toBe(4);
    expect(r.stdout).toBe("");
    expect(JSON.parse(r.stderr)).toMatchObject({
      schemaVersion: "1",
      ok: false,
      error: { code: "AUTH_REQUIRED" },
    });
  });
});
