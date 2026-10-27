import { vi } from "vitest";
import type { Company, Core, User } from "@ou-manager/core";
import {
  DEFAULT_CONFIG,
  type Config,
  type ConfigStore,
} from "../src/config/store.js";
import type { Deps } from "../src/context.js";

// ---- test data ---------------------------------------------------------------------------------

export const aUser = (overrides: Partial<User> = {}): User => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "Karl-Johan Bailey",
  email: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

export const aCompany = (overrides: Partial<Company> = {}): Company => ({
  id: "22222222-2222-4222-8222-222222222222",
  country: "EE",
  registryCode: "12345678",
  name: "Syncpoly OÜ",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  archivedAt: null,
  ...overrides,
});

// ---- the doubles -------------------------------------------------------------------------------

// The CLI's whole job is translation: argv -> a call on core -> output. Core itself is tested
// elsewhere, so here (and only here) a stub with recorded calls is the right tool.
// Any method a test did not set up fails loudly if it is called.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsync = (...args: any[]) => Promise<any>;
const unstubbed = (name: string) =>
  vi.fn<AnyAsync>(async () => {
    throw new Error(`core.${name} was called, but this test did not stub it`);
  });

export function stubCore() {
  return {
    users: {
      add: unstubbed("users.add"),
      list: unstubbed("users.list"),
      get: unstubbed("users.get"),
    },
    companies: {
      add: unstubbed("companies.add"),
      list: unstubbed("companies.list"),
      get: unstubbed("companies.get"),
      archive: unstubbed("companies.archive"),
    },
  };
}

/** A config store that lives in memory, and lets a test look at what was saved. */
export function inMemoryConfigStore(initial: Partial<Config> = {}) {
  let config: Config = { ...DEFAULT_CONFIG, ...initial };
  const store: ConfigStore & { current(): Config } = {
    read: async () => ({ ...config }),
    update: async (patch) => (config = { ...config, ...patch }),
    current: () => config,
  };
  return store;
}

/**
 * A complete, fake outside world for main(). By default you are signed in as `me`;
 * pass `signedInAs: null` for a fresh install with nobody selected.
 */
export function testDeps(
  options: {
    env?: Record<string, string>;
    config?: Partial<Config>;
    signedInAs?: User | null;
  } = {},
) {
  const me = options.signedInAs === undefined ? aUser() : options.signedInAs;
  const core = stubCore();
  if (me) core.users.get.mockResolvedValue(me);

  const config = inMemoryConfigStore({
    ...(me ? { activeUser: me.id } : {}),
    ...options.config,
  });

  let out = "";
  let err = "";
  const deps: Deps = {
    io: {
      out: { write: (s) => void (out += s), isTTY: false, columns: 80 },
      err: { write: (s) => void (err += s), isTTY: false },
      colorEnabled: false,
      interactive: false,
    },
    env: options.env ?? {},
    version: "0.0.0-test",
    core: () => core as unknown as Core,
    config,
  };

  return { deps, core, config, me, stdout: () => out, stderr: () => err };
}
