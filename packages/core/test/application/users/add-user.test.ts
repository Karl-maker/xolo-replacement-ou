import { describe, expect, it, vi } from "vitest";
import { addUser } from "../../../src/application/users/add-user.js";
import { createFakes } from "../../support/fakes.js";
import { aUser } from "../../support/builders.js";

function setup() {
  const fakes = createFakes();
  return { ...fakes, run: addUser(fakes.users) };
}

describe("addUser", () => {
  it("stores the user", async () => {
    const t = setup();

    const user = await t.run({ name: "Karl-Johan Bailey" });

    expect(user).toMatchObject({ name: "Karl-Johan Bailey", email: null });
    expect(t.users.all()).toEqual([user]);
  });

  it("tidies the name and lower-cases the email", async () => {
    const t = setup();

    const user = await t.run({
      name: "  Karl-Johan   Bailey ",
      email: "  KJ@Example.COM ",
    });

    expect(user).toMatchObject({
      name: "Karl-Johan Bailey",
      email: "kj@example.com",
    });
  });

  it("treats a blank email as no email", async () => {
    const t = setup();

    expect(await t.run({ name: "KJ", email: "   " })).toMatchObject({
      email: null,
    });
  });

  it.each([
    ["an empty name", ""],
    ["a blank name", "   "],
    ["a name over 200 characters", "x".repeat(201)],
  ])("rejects %s before touching storage", async (_label, name) => {
    const t = setup();
    const create = vi.spyOn(t.users, "create");

    await expect(t.run({ name })).rejects.toMatchObject({
      code: "INVALID_NAME",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an email that is already taken", async () => {
    const t = setup();
    t.users.seed(aUser({ email: "kj@example.com" }));

    await expect(
      t.run({ name: "Other", email: "KJ@example.com" }),
    ).rejects.toMatchObject({
      code: "USER_ALREADY_EXISTS",
    });
  });

  it("allows several users without an email", async () => {
    const t = setup();

    await t.run({ name: "One" });
    await t.run({ name: "Two" });

    expect(t.users.all()).toHaveLength(2);
  });
});
