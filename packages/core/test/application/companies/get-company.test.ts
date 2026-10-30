import { describe, expect, it, vi } from "vitest";
import { getCompany } from "../../../src/application/companies/get-company.js";
import { createFakes } from "../../support/fakes.js";
import { aCompany, aUser, asAgent, asUser } from "../../support/builders.js";

function setup() {
  const fakes = createFakes();
  const me = fakes.users.seed(aUser({ name: "Me" }));
  const someoneElse = fakes.users.seed(aUser({ name: "Someone else" }));
  const company = fakes.companies.seed(
    aCompany({ registryCode: "12345678" }),
    me.id,
  );
  const run = getCompany(fakes.companies);
  return { ...fakes, me, someoneElse, company, run };
}

describe("getCompany", () => {
  describe("finding a company", () => {
    it("by id", async () => {
      const t = setup();

      expect(
        await t.run({ actor: asUser(t.me), ref: t.company.id, country: "EE" }),
      ).toEqual(t.company);
    });

    it("by registration number", async () => {
      const t = setup();

      expect(
        await t.run({ actor: asUser(t.me), ref: "12345678", country: "EE" }),
      ).toEqual(t.company);
    });

    it("does not need the country when given an id", async () => {
      const t = setup();

      // The country is irrelevant for an id, so even a nonsense value must not matter.
      expect(
        await t.run({ actor: asUser(t.me), ref: t.company.id, country: "??" }),
      ).toEqual(t.company);
    });
  });

  describe("when it cannot be found", () => {
    it("says not found for an unknown registry code", async () => {
      const t = setup();

      await expect(
        t.run({ actor: asUser(t.me), ref: "10422334", country: "EE" }),
      ).rejects.toMatchObject({
        code: "COMPANY_NOT_FOUND",
      });
    });

    it("says not found, not forbidden, for someone else's company (existence is not revealed)", async () => {
      const t = setup();

      await expect(
        t.run({ actor: asUser(t.someoneElse), ref: "12345678", country: "EE" }),
      ).rejects.toMatchObject({
        code: "COMPANY_NOT_FOUND",
      });
    });
  });

  describe("when the reference is malformed", () => {
    it.each([
      [
        "a blank registration number",
        { ref: "   ", country: "EE" },
        "INVALID_REGISTRY_CODE",
      ],
      [
        "an invalid country",
        { ref: "12345678", country: "ZZ" },
        "INVALID_COUNTRY_CODE",
      ],
    ] as const)("rejects %s before searching", async (_label, input, code) => {
      const t = setup();
      const find = vi.spyOn(t.companies, "findForUser");

      await expect(
        t.run({ actor: asUser(t.me), ...input }),
      ).rejects.toMatchObject({ code });
      expect(find).not.toHaveBeenCalled();
    });
  });

  describe("agents", () => {
    it("can read the company of the person they act for", async () => {
      const t = setup();

      expect(
        await t.run({
          actor: asAgent(t.me, ["companies:read"]),
          ref: "12345678",
          country: "EE",
        }),
      ).toEqual(t.company);
    });

    it("are refused without companies:read", async () => {
      const t = setup();

      await expect(
        t.run({ actor: asAgent(t.me, []), ref: "12345678", country: "EE" }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });
  });
});
