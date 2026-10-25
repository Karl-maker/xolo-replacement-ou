import { describe, expect, it, vi } from "vitest";
import { archiveCompany } from "../../../src/application/companies/archive-company.js";
import { createFakes, NOW } from "../../support/fakes.js";
import { aCompany, aUser, asAgent, asUser } from "../../support/builders.js";

function setup() {
  const fakes = createFakes();
  const me = fakes.users.seed(aUser({ name: "Me" }));
  const someoneElse = fakes.users.seed(aUser({ name: "Someone else" }));
  const company = fakes.companies.seed(
    aCompany({ registryCode: "12345678" }),
    me.id,
  );
  const run = archiveCompany({
    companies: fakes.companies,
    clock: fakes.clock,
  });
  return { ...fakes, me, someoneElse, company, run };
}

describe("archiveCompany", () => {
  it("stamps the company with the time from the injected clock", async () => {
    const t = setup();

    const archived = await t.run({
      actor: asUser(t.me),
      ref: "12345678",
      country: "EE",
    });

    expect(archived.archivedAt).toEqual(NOW);
    expect(t.companies.all()[0]?.archivedAt).toEqual(NOW);
  });

  it("archives rather than deletes: the company is still there", async () => {
    const t = setup();

    await t.run({ actor: asUser(t.me), ref: t.company.id, country: "EE" });

    expect(t.companies.all()).toHaveLength(1);
  });

  it("refuses to archive someone else's company, and changes nothing", async () => {
    const t = setup();
    const archive = vi.spyOn(t.companies, "archive");

    await expect(
      t.run({ actor: asUser(t.someoneElse), ref: "12345678", country: "EE" }),
    ).rejects.toMatchObject({
      code: "COMPANY_NOT_FOUND",
    });
    expect(archive).not.toHaveBeenCalled();
    expect(t.company.archivedAt).toBeNull();
  });

  it("reports not found for an unknown company", async () => {
    const t = setup();

    await expect(
      t.run({ actor: asUser(t.me), ref: "10422334", country: "EE" }),
    ).rejects.toMatchObject({
      code: "COMPANY_NOT_FOUND",
    });
  });

  describe("agents", () => {
    it("can archive with companies:write and companies:read", async () => {
      const t = setup();

      const archived = await t.run({
        actor: asAgent(t.me, ["companies:read", "companies:write"]),
        ref: "12345678",
        country: "EE",
      });

      expect(archived.archivedAt).toEqual(NOW);
    });

    it("cannot archive with write alone, because finding the company needs read", async () => {
      const t = setup();

      await expect(
        t.run({
          actor: asAgent(t.me, ["companies:write"]),
          ref: "12345678",
          country: "EE",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(t.company.archivedAt).toBeNull();
    });

    it("cannot archive with read alone", async () => {
      const t = setup();

      await expect(
        t.run({
          actor: asAgent(t.me, ["companies:read"]),
          ref: "12345678",
          country: "EE",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
