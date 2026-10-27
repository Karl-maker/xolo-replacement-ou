// In-process tests for bin.ts.
//
// bin.ts runs as soon as it is imported (it is a script, not a library), so each test:
//   1. replaces main() and createRuntime() with mocks, so we only test the wiring
//   2. sets process.argv the way Node would
//   3. imports bin.ts fresh and checks what it did
//   4. puts the real process back exactly as it was
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

const mainMock = vi.hoisted(() => vi.fn());
const closeMock = vi.hoisted(() => vi.fn());
const createRuntimeMock = vi.hoisted(() => vi.fn());
vi.mock("../src/main.js", () => ({ main: mainMock }));
vi.mock("../src/runtime.js", () => ({ createRuntime: createRuntimeMock }));

describe("bin.ts (in-process)", () => {
  const realArgv = process.argv;
  const realExitCode = process.exitCode;
  const runtimeDeps = { marker: "runtime deps" };

  let processOn: MockInstance;
  let stdoutOn: MockInstance;
  let exitSpy: MockInstance;

  beforeEach(() => {
    vi.resetModules(); // forget the previous import so bin.ts runs again
    mainMock.mockReset();
    mainMock.mockResolvedValue(0);
    closeMock.mockReset();
    closeMock.mockResolvedValue(undefined);
    createRuntimeMock.mockReset();
    createRuntimeMock.mockReturnValue({ deps: runtimeDeps, close: closeMock });

    // Capture listeners instead of attaching them to the real process.
    processOn = vi.spyOn(process, "on").mockImplementation(() => process);
    stdoutOn = vi
      .spyOn(process.stdout, "on")
      .mockImplementation(() => process.stdout);
    exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    process.argv = realArgv;
    process.exitCode = realExitCode; // otherwise the test runner itself exits with our code
    vi.restoreAllMocks();
  });

  // Find the listener bin.ts registered for `event`, so a test can trigger it by hand.
  const handlerFor = (spy: { mock: { calls: unknown[][] } }, event: string) =>
    spy.mock.calls.find((call: unknown[]) => call[0] === event)?.[1] as (
      ...args: unknown[]
    ) => void;

  it("passes argv without `node` and the script path to main()", async () => {
    process.argv = ["node", "oum", "company", "list"];
    await import("../src/bin.js");

    expect(mainMock).toHaveBeenCalledTimes(1);
    expect(mainMock.mock.calls[0]?.[0]).toEqual(["company", "list"]);
  });

  it("builds the runtime from the real environment, version and config path", async () => {
    await import("../src/bin.js");

    const options = createRuntimeMock.mock.calls[0]?.[0];
    expect(options.env).toBe(process.env);
    expect(options.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(options.configPath).toMatch(/oum[\\/]config\.json$|\.json$/);
    expect(typeof options.io.out.write).toBe("function");
  });

  it("hands main() the runtime's dependencies", async () => {
    await import("../src/bin.js");

    expect(mainMock.mock.calls[0]?.[1]).toBe(runtimeDeps);
  });

  it("sets process.exitCode from main() and does not call process.exit()", async () => {
    mainMock.mockResolvedValue(3);
    await import("../src/bin.js");

    expect(process.exitCode).toBe(3);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("closes the runtime after main() finishes, so the database pool cannot keep Node alive", async () => {
    await import("../src/bin.js");

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("closes the runtime even when main() throws", async () => {
    mainMock.mockRejectedValue(new Error("boom"));

    await expect(import("../src/bin.js")).rejects.toThrow("boom");
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it("exits 130 on SIGINT", async () => {
    await import("../src/bin.js");

    handlerFor(processOn, "SIGINT")();
    expect(exitSpy).toHaveBeenCalledWith(130);
  });

  it("treats EPIPE on stdout as a quiet exit 0", async () => {
    await import("../src/bin.js");

    handlerFor(
      stdoutOn,
      "error",
    )(Object.assign(new Error("broken pipe"), { code: "EPIPE" }));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("rethrows any other stdout error", async () => {
    await import("../src/bin.js");

    const boom = Object.assign(new Error("disk on fire"), { code: "EIO" });
    expect(() => handlerFor(stdoutOn, "error")(boom)).toThrow("disk on fire");
  });
});
