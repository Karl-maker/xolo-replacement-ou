import { describe, expect, it } from "vitest";
import { DomainError } from "@ou-manager/core";
import { main } from "../../src/main.js";
import { aUser, testDeps } from "../helpers.js";

describe("oum user add", () => {
  it("adds a user with a name and an optional email", async () => {
    const t = testDeps({ signedInAs: null }); // adding the first user needs nobody to be selected
    t.core.users.add.mockResolvedValue(aUser());

    expect(
      await main(
        [
          "user",
          "add",
          "--name",
          "Karl-Johan Bailey",
          "--email",
          "kj@example.com",
        ],
        t.deps,
      ),
    ).toBe(0);
    expect(t.core.users.add).toHaveBeenCalledWith({
      name: "Karl-Johan Bailey",
      email: "kj@example.com",
    });
    expect(t.stdout()).toContain('oum user use "Karl-Johan Bailey"');
  });

  it("works without an email", async () => {
    const t = testDeps({ signedInAs: null });
    t.core.users.add.mockResolvedValue(aUser());

    await main(["user", "add", "-n", "Karl-Johan Bailey"], t.deps);

    expect(t.core.users.add).toHaveBeenCalledWith({
      name: "Karl-Johan Bailey",
      email: undefined,
    });
  });

  it("exits 5 when the email is already taken", async () => {
    const t = testDeps({ signedInAs: null });
    t.core.users.add.mockRejectedValue(
      new DomainError("USER_ALREADY_EXISTS", "That email is taken."),
    );

    expect(
      await main(["user", "add", "-n", "X", "-e", "x@example.com"], t.deps),
    ).toBe(5);
  });
});

describe("oum user list", () => {
  it("lists users without needing anybody selected", async () => {
    const t = testDeps({ signedInAs: null });
    t.core.users.list.mockResolvedValue([
      aUser(),
      aUser({
        id: "33333333-3333-4333-8333-333333333333",
        name: "Someone Else",
        email: "s@example.com",
      }),
    ]);

    expect(await main(["user", "list"], t.deps)).toBe(0);
    expect(t.stdout()).toContain("Karl-Johan Bailey");
    expect(t.stdout()).toContain("s@example.com");
  });

  it("explains how to add the first user", async () => {
    const t = testDeps({ signedInAs: null });
    t.core.users.list.mockResolvedValue([]);

    await main(["user", "list"], t.deps);

    expect(t.stdout()).toContain("oum user add");
  });
});

describe("oum user use", () => {
  it("saves the user's id (not their name) as the active user", async () => {
    const t = testDeps({ signedInAs: null });
    t.core.users.get.mockResolvedValue(aUser());

    expect(await main(["user", "use", "Karl-Johan Bailey"], t.deps)).toBe(0);
    expect(t.core.users.get).toHaveBeenCalledWith("Karl-Johan Bailey");
    expect(t.config.current().activeUser).toBe(aUser().id);
    expect(t.stdout()).toContain("Now acting as Karl-Johan Bailey");
  });

  it("changes nothing when the user does not exist", async () => {
    const t = testDeps({ signedInAs: null });
    t.core.users.get.mockRejectedValue(
      new DomainError("USER_NOT_FOUND", 'No user found for "Nobody".'),
    );

    expect(await main(["user", "use", "Nobody"], t.deps)).toBe(3);
    expect(t.config.current().activeUser).toBeUndefined();
  });
});

describe("oum whoami", () => {
  it("says who you are and that it came from the saved active user", async () => {
    const t = testDeps();

    expect(await main(["whoami"], t.deps)).toBe(0);
    expect(t.stdout()).toContain("Karl-Johan Bailey");
    expect(t.stdout()).toContain("the active user (oum user use)");
  });

  it("names the source in --json too", async () => {
    const t = testDeps({ env: { OUM_USER: "Karl-Johan Bailey" } });

    await main(["whoami", "--json"], t.deps);

    expect(JSON.parse(t.stdout()).data).toMatchObject({
      name: "Karl-Johan Bailey",
      source: "env",
    });
  });

  it("exits 4 with a hint when nobody is selected", async () => {
    const t = testDeps({ signedInAs: null });

    expect(await main(["whoami"], t.deps)).toBe(4);
    expect(t.stderr()).toContain("oum user use");
  });
});
