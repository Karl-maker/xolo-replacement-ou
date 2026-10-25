import { describe, expect, it } from "vitest";
import { createCore } from "../../src/index.js";
import { createFakes, NOW } from "../support/fakes.js";
import { aCompany, aUser, asUser } from "../support/builders.js";

// The use cases are tested one by one elsewhere. This file only proves that createCore wires them up.
describe("createCore", () => {
  it("exposes every use case", () => {
    const { users, companies } = createFakes();
    const core = createCore({ users, companies });

    expect(Object.keys(core.users).sort()).toEqual(["add", "get", "list"]);
    expect(Object.keys(core.companies).sort()).toEqual([
      "add",
      "archive",
      "get",
      "list",
    ]);
  });

  it("hands the same repositories to every use case", async () => {
    const { users, companies } = createFakes();
    const core = createCore({ users, companies });

    const owner = await core.users.add({ name: "KJ" });
    const company = await core.companies.add({
      actor: asUser(owner),
      name: "Syncpoly OÜ",
      registryCode: "12345678",
      country: "EE",
    });

    expect(
      await core.companies.get({
        actor: asUser(owner),
        ref: company.id,
        country: "EE",
      }),
    ).toEqual(company);
  });

  it("uses the injected clock", async () => {
    const { users, companies, clock } = createFakes();
    const owner = users.seed(aUser());
    companies.seed(aCompany(), owner.id);
    const core = createCore({ users, companies, clock });

    const archived = await core.companies.archive({
      actor: asUser(owner),
      ref: "12345678",
      country: "EE",
    });

    expect(archived.archivedAt).toEqual(NOW);
  });

  it("falls back to the real clock when none is injected", async () => {
    const { users, companies } = createFakes();
    const owner = users.seed(aUser());
    companies.seed(aCompany(), owner.id);
    const core = createCore({ users, companies });
    const before = Date.now();

    const archived = await core.companies.archive({
      actor: asUser(owner),
      ref: "12345678",
      country: "EE",
    });

    expect(archived.archivedAt?.getTime()).toBeGreaterThanOrEqual(before);
  });
});
