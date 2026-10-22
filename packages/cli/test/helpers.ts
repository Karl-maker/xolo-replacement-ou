import type { Deps } from "../src/context.js";

export function testDeps(overrides: Partial<Deps> = {}) {
  let out = "";
  let err = "";

  const deps: Deps = {
    io: {
      out: { write: (s) => void (out += s), isTTY: false, columns: 80 },
      err: { write: (s) => void (err += s), isTTY: false },
      colorEnabled: false,
      interactive: false,
    },
    env: {},
    version: "0.0.0-test",
    ...overrides,
  };

  return { deps, stdout: () => out, stderr: () => err };
}