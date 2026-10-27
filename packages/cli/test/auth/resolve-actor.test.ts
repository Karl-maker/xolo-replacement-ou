import { describe, expect, it, vi } from "vitest";
import { DomainError, type Core } from "@ou-manager/core";
import { resolveActor } from "../../src/auth/resolve-actor.js";
import { DEFAULT_CONFIG } from "../../src/config/store.js";
import { CliError } from "../../src/errors/cli-error.js";
import { aUser } from "../helpers.js";

// A core whose users.get knows exactly one reference per user.
function coreKnowing(
  ...users: Array<{ ref: string; id: string; name: string }>
) {
  const get = vi.fn(async (ref: string) => {
    const found = users.find((u) => u.ref === ref);
    if (!found)
      throw new DomainError("USER_NOT_FOUND", `No user found for "${ref}".`);
    return aUser({ id: found.id, name: found.name });
  });
  const core = { users: { get } } as unknown as Core;
  return { core: () => core, get };
}

const alice = {
  ref: "alice",
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Alice",
};
const bob = {
  ref: "bob",
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Bob",
};
const carol = {
  ref: "carol",
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  name: "Carol",
};

describe("resolveActor", () => {
  it("prefers --as over the environment and the saved user", async () => {
    const t = coreKnowing(alice, bob, carol);

    const who = await resolveActor({
      flagAs: "alice",
      env: { OUM_USER: "bob" },
      config: { ...DEFAULT_CONFIG, activeUser: "carol" },
      core: t.core,
    });

    expect(who).toMatchObject({
      source: "flag",
      actor: { kind: "user", userId: alice.id },
    });
  });

  it("prefers OUM_USER over the saved user", async () => {
    const t = coreKnowing(bob, carol);

    const who = await resolveActor({
      flagAs: undefined,
      env: { OUM_USER: "bob" },
      config: { ...DEFAULT_CONFIG, activeUser: "carol" },
      core: t.core,
    });

    expect(who).toMatchObject({ source: "env", actor: { userId: bob.id } });
  });

  it("falls back to the saved active user", async () => {
    const t = coreKnowing(carol);

    const who = await resolveActor({
      flagAs: undefined,
      env: {},
      config: { ...DEFAULT_CONFIG, activeUser: "carol" },
      core: t.core,
    });

    expect(who).toMatchObject({
      source: "config",
      actor: { userId: carol.id },
    });
  });

  it("ignores blank values, so an empty variable does not count as a choice", async () => {
    const t = coreKnowing(carol);

    const who = await resolveActor({
      flagAs: "  ",
      env: { OUM_USER: "" },
      config: { ...DEFAULT_CONFIG, activeUser: "carol" },
      core: t.core,
    });

    expect(who.source).toBe("config");
  });

  it("fails with AUTH_REQUIRED and never opens the database when nothing is selected", async () => {
    const core = vi.fn(() => {
      throw new Error("the database must not be opened");
    });

    const attempt = resolveActor({
      flagAs: undefined,
      env: {},
      config: DEFAULT_CONFIG,
      core,
    });

    await expect(attempt).rejects.toBeInstanceOf(CliError);
    await expect(attempt).rejects.toMatchObject({
      info: { code: "AUTH_REQUIRED" },
      exitCode: 4,
    });
    expect(core).not.toHaveBeenCalled();
  });

  it("says where a stale choice came from, so it can be fixed", async () => {
    const t = coreKnowing(alice);

    const attempt = resolveActor({
      flagAs: undefined,
      env: { OUM_USER: "ghost" },
      config: DEFAULT_CONFIG,
      core: t.core,
    });

    await expect(attempt).rejects.toMatchObject({
      info: {
        code: "AUTH_REQUIRED",
        message: expect.stringContaining("OUM_USER environment variable"),
      },
    });
  });

  it("lets an unexpected failure through instead of calling it an auth problem", async () => {
    const outage = new Error("connection lost");
    const core = {
      users: { get: vi.fn().mockRejectedValue(outage) },
    } as unknown as Core;

    await expect(
      resolveActor({
        flagAs: "alice",
        env: {},
        config: DEFAULT_CONFIG,
        core: () => core,
      }),
    ).rejects.toBe(outage);
  });
});
