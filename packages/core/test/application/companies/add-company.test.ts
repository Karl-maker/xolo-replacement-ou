import { describe, expect, it, vi } from "vitest";
import { addCompany } from "../../../src/application/companies/add-company.js";
import { createFakes } from "../../support/fakes.js";
import {
  aCompany,
  anAuditContext,
  aUser,
  asAgent,
  asUser,
} from "../../support/builders.js";

// Every test builds its own world with setup(): fresh fakes, the use case under test, a seeded owner.
function setup() {
  const fakes = createFakes();
  const owner = fakes.users.seed(aUser());
  const run = addCompany({
    companies: fakes.companies,
    users: fakes.users,
    transactions: fakes.transactions,
    clock: fakes.clock,
  });
  const valid = {
    name: "Syncpoly OÜ",
    registryCode: "12345678",
    country: "EE",
  };
  return { ...fakes, owner, run, valid, auditContext: anAuditContext() };
}

describe("addCompany", () => {
  describe("when the input is valid", () => {
    it("stores the company and makes the actor its owner", async () => {
      const t = setup();

      const company = await t.run({
        actor: asUser(t.owner),
        ...t.valid,
        audit: t.auditContext,
      });

      expect(company).toMatchObject({
        name: "Syncpoly OÜ",
        registryCode: "12345678",
        country: "EE",
        archivedAt: null,
      });
      expect(t.companies.all()).toEqual([company]);
      expect(t.companies.ownersOf(company.id)).toEqual([t.owner.id]);
      expect(t.audit.all()).toEqual([
        expect.objectContaining({
          action: "company.created",
          companyId: company.id,
          context: t.auditContext,
        }),
      ]);
    });

    it("normalises country, registry code and name", async () => {
      const t = setup();

      const company = await t.run({
        actor: asUser(t.owner),
        name: "  Syncpoly    OÜ ",
        registryCode: " 1234-5678 ",
        country: "us",
        audit: t.auditContext,
      });

      expect(company).toMatchObject({
        name: "Syncpoly OÜ",
        registryCode: "1234-5678",
        country: "US",
      });
    });

    it("creates a company without a registration number", async () => {
      const t = setup();

      const company = await t.run({
        actor: asUser(t.owner),
        name: "Community Learning Group",
        country: "BR",
        audit: t.auditContext,
      });

      expect(company).toMatchObject({
        name: "Community Learning Group",
        country: "BR",
        registryCode: null,
      });
    });

    it("makes the person the agent acts for the owner, not the agent", async () => {
      const t = setup();

      const company = await t.run({
        actor: asAgent(t.owner, ["companies:write"]),
        ...t.valid,
        audit: t.auditContext,
      });

      expect(t.companies.ownersOf(company.id)).toEqual([t.owner.id]);
    });
  });

  describe("authorisation", () => {
    it.each([[[]], [["companies:read"]]] as const)(
      "refuses an agent holding %j and stores nothing",
      async (granted) => {
        const t = setup();

        await expect(
          t.run({
            actor: asAgent(t.owner, [...granted]),
            ...t.valid,
            audit: t.auditContext,
          }),
        ).rejects.toMatchObject({
          code: "FORBIDDEN",
        });
        expect(t.companies.all()).toHaveLength(0);
      },
    );

    it("checks permission before validating, so a refused agent learns nothing about the input", async () => {
      const t = setup();

      await expect(
        t.run({
          actor: asAgent(t.owner, []),
          name: "",
          registryCode: "nope",
          country: "??",
          audit: t.auditContext,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  describe("validation", () => {
    it.each([
      [
        "a country that is not two letters",
        { country: "Estonia" },
        "INVALID_COUNTRY_CODE",
      ],
      ["an unknown ISO country", { country: "ZZ" }, "INVALID_COUNTRY_CODE"],
      [
        "a blank supplied registration number",
        { registryCode: "   " },
        "INVALID_REGISTRY_CODE",
      ],
      ["an empty name", { name: "   " }, "INVALID_NAME"],
    ] as const)("rejects %s", async (_label, change, code) => {
      const t = setup();
      const create = vi.spyOn(t.companies, "create");

      await expect(
        t.run({
          actor: asUser(t.owner),
          ...t.valid,
          ...change,
          audit: t.auditContext,
        }),
      ).rejects.toMatchObject({ code });

      // Bad input must be caught before any storage work happens.
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe("business rules", () => {
    it("rejects an unknown owner", async () => {
      const t = setup();
      const stranger = aUser(); // never seeded

      await expect(
        t.run({ actor: asUser(stranger), ...t.valid, audit: t.auditContext }),
      ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
      expect(t.companies.all()).toHaveLength(0);
    });

    it("rejects a second company with the same country and registry code", async () => {
      const t = setup();
      t.companies.seed(aCompany(), t.owner.id);

      await expect(
        t.run({ actor: asUser(t.owner), ...t.valid, audit: t.auditContext }),
      ).rejects.toMatchObject({
        code: "COMPANY_ALREADY_EXISTS",
      });
      expect(t.companies.all()).toHaveLength(1);
    });

    it("allows multiple companies without registration numbers", async () => {
      const t = setup();

      await t.run({
        actor: asUser(t.owner),
        name: "First learning community",
        country: "US",
        audit: t.auditContext,
      });
      await t.run({
        actor: asUser(t.owner),
        name: "Second learning community",
        country: "US",
        audit: t.auditContext,
      });

      expect(t.companies.all()).toHaveLength(2);
    });
  });

  describe("when storage fails", () => {
    it("lets the unexpected error through untouched instead of disguising it", async () => {
      const t = setup();
      const outage = new Error("connection lost");
      vi.spyOn(t.companies, "create").mockRejectedValueOnce(outage);

      await expect(
        t.run({ actor: asUser(t.owner), ...t.valid, audit: t.auditContext }),
      ).rejects.toBe(outage);
    });
  });
});
