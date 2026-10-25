import { describe, expect, it } from "vitest";
import { listUsers } from "../../../src/application/users/list-users.js";
import { createFakes } from "../../support/fakes.js";
import { aUser } from "../../support/builders.js";

describe("listUsers", () => {
  it("returns an empty list when there are no users", async () => {
    const t = createFakes();

    expect(await listUsers(t.users)()).toEqual([]);
  });

  it("returns every user", async () => {
    const t = createFakes();
    const one = t.users.seed(aUser({ name: "One" }));
    const two = t.users.seed(aUser({ name: "Two" }));

    expect(await listUsers(t.users)()).toEqual([one, two]);
  });
});
