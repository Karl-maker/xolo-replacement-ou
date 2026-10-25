import { describe, expect, it } from "vitest";
import { listCompanies } from "../../../src/application/companies/list-companies.js";
import { createFakes } from "../../support/fakes.js";
import { aCompany, aUser, asAgent, asUser } from "../../support/builders.js";

function setup() {
  const fakes = createFakes();
  const me = fakes.users.seed(aUser({ name: "Me" }));
  const someoneElse = fakes.users.seed(aUser({ name: "Someone else" }));
  const run = listCompanies(fakes.companies);
  return { ...fakes, me, someoneElse, run };
}

describe("listCompanies", () => {
  it("returns only the companies the actor belongs to", async () => {
    const t = setup();
    const mine = t.companies.seed(
      aCompany({ registryCode: "12345678" }),
      t.me.id,
    );
    t.companies.seed(aCompany({ registryCode: "10422334" }), t.someoneElse.id);

    expect(await t.run({ actor: asUser(t.me) })).toEqual([mine]);
  });

  it("returns an empty list when the actor has no companies", async () => {
    const t = setup();
    t.companies.seed(aCompany(), t.someoneElse.id);

    expect(await t.run({ actor: asUser(t.me) })).toEqual([]);
  });

  it("hides archived companies unless asked", async () => {
    const t = setup();
    const active = t.companies.seed(
      aCompany({ registryCode: "12345678" }),
      t.me.id,
    );
    const archived = t.companies.seed(
      aCompany({ registryCode: "10422334", archivedAt: new Date() }),
      t.me.id,
    );

    expect(await t.run({ actor: asUser(t.me) })).toEqual([active]);
    expect(await t.run({ actor: asUser(t.me), includeArchived: true })).toEqual(
      [active, archived],
    );
  });

  describe("agents", () => {
    it("see the companies of the person they act for", async () => {
      const t = setup();
      const mine = t.companies.seed(aCompany(), t.me.id);

      expect(await t.run({ actor: asAgent(t.me, ["companies:read"]) })).toEqual(
        [mine],
      );
    });

    it("are refused without companies:read", async () => {
      const t = setup();

      await expect(
        t.run({ actor: asAgent(t.me, ["companies:write"]) }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
