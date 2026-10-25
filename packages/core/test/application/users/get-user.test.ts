import { describe, expect, it, vi } from "vitest";
import { getUser } from "../../../src/application/users/get-user.js";
import { createFakes } from "../../support/fakes.js";
import { aUser } from "../../support/builders.js";

function setup() {
  const fakes = createFakes();
  const kj = fakes.users.seed(aUser({ name: "Karl-Johan Bailey" }));
  return { ...fakes, kj, run: getUser(fakes.users) };
}

describe("getUser", () => {
  it("finds a user by id", async () => {
    const t = setup();

    expect(await t.run(t.kj.id)).toEqual(t.kj);
  });

  it("finds a user by name, ignoring case and surrounding spaces", async () => {
    const t = setup();

    expect(await t.run("  karl-johan BAILEY ")).toEqual(t.kj);
  });

  it("reports not found for an unknown reference", async () => {
    const t = setup();

    await expect(t.run("Nobody")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
    });
  });

  it("refuses to guess when two users share a name, and lists the candidates", async () => {
    const t = setup();
    const twin = t.users.seed(aUser({ name: "Karl-Johan Bailey" }));

    await expect(t.run("Karl-Johan Bailey")).rejects.toMatchObject({
      code: "USER_NOT_FOUND",
      details: { candidates: [t.kj.id, twin.id] },
    });
  });

  it("still finds either twin by id", async () => {
    const t = setup();
    const twin = t.users.seed(aUser({ name: "Karl-Johan Bailey" }));

    expect(await t.run(twin.id)).toEqual(twin);
  });

  it("lets an unexpected storage error through instead of treating it as 'not an id'", async () => {
    const t = setup();
    const outage = new Error("connection lost");
    vi.spyOn(t.users, "findById").mockRejectedValueOnce(outage);

    await expect(t.run(t.kj.id)).rejects.toBe(outage);
  });
});
