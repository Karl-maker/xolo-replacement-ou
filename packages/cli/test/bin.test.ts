// bin.ts runs as soon as it is imported, so each test:
//   1. replaces main() with a mock (we only test the wiring)
//   2. sets process.argv the way Node would
//   3. imports bin.ts fresh and checks what it did
//   4. puts the real process back exactly as it was
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";

const mainMock = vi.hoisted(() => vi.fn());
vi.mock("../src/main.js", () => ({ main: mainMock }));

describe("bin.ts (in-process)", () => {
  const realArgv = process.argv;
  const realExitCode = process.exitCode;

  let processOn: MockInstance;
  let stdoutOn: MockInstance;
  let exitSpy: MockInstance;

  beforeEach(() => {
    vi.resetModules(); // forget the previous import so bin.ts runs again
    mainMock.mockReset();
    mainMock.mockResolvedValue(0);

    // Capture listeners instead of attaching them to the real process.
    processOn = vi.spyOn(process, "on").mockImplementation(() => process);
    stdoutOn = vi.spyOn(process.stdout, "on").mockImplementation(() => process.stdout);
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    process.argv = realArgv;
    process.exitCode = realExitCode; // otherwise the test runner itself exits with our code
    vi.restoreAllMocks();
  });

  // Find the listener bin.ts registered for `event`, so a test can trigger it by hand.
  const handlerFor = (spy: { mock: { calls: unknown[][] } }, event: string) =>
    spy.mock.calls.find((call: unknown[]) => call[0] === event)?.[1] as (...args: unknown[]) => void;

  it("passes argv without `node` and the script path to main()", async () => {
    process.argv = ["node", "oum", "projects", "list"];
    await import("../src/bin.js");

    expect(mainMock).toHaveBeenCalledTimes(1);
    expect(mainMock.mock.calls[0]?.[0]).toEqual(["projects", "list"]);
  });

  it("hands main() real dependencies, including the package version", async () => {
    await import("../src/bin.js");

    const deps = mainMock.mock.calls[0]?.[1];
    expect(deps.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(typeof deps.io.out.write).toBe("function");
    expect(typeof deps.io.err.write).toBe("function");
  });

  it("sets process.exitCode from main() and does not call process.exit()", async () => {
    mainMock.mockResolvedValue(3);
    await import("../src/bin.js");

    expect(process.exitCode).toBe(3);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("exits 130 on SIGINT", async () => {
    await import("../src/bin.js");

    handlerFor(processOn, "SIGINT")();
    expect(exitSpy).toHaveBeenCalledWith(130);
  });

  it("treats EPIPE on stdout as a quiet exit 0", async () => {
    await import("../src/bin.js");

    handlerFor(stdoutOn, "error")(Object.assign(new Error("broken pipe"), { code: "EPIPE" }));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("rethrows any other stdout error", async () => {
    await import("../src/bin.js");

    const boom = Object.assign(new Error("disk on fire"), { code: "EIO" });
    expect(() => handlerFor(stdoutOn, "error")(boom)).toThrow("disk on fire");
  });
});