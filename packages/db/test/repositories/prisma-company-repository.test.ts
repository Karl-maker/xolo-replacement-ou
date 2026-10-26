import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  closeDatabase,
  db,
  insertCompany,
  insertUser,
  resetDatabase,
  sql,
} from "../support/test-db.js";

beforeEach(resetDatabase);
afterAll(closeDatabase);

const count = async (table: string) =>
  Number((await sql.query(`SELECT count(*) FROM ${table}`)).rows[0].count);

describe("PrismaCompanyRepository", () => {
  describe("create", () => {
    it("stores the company and its owner membership together", async () => {
      const ownerId = await insertUser();

      const company = await db.companies.create(
        { country: "EE", registryCode: "12345678", name: "Syncpoly OÜ" },
        ownerId,
      );

      expect(company).toEqual({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        country: "EE",
        registryCode: "12345678",
        name: "Syncpoly OÜ",
        createdAt: expect.any(Date),
        archivedAt: null,
      });
      const memberships = await sql.query(
        "SELECT user_id, role FROM memberships WHERE company_id = $1",
        [company.id],
      );
      expect(memberships.rows).toEqual([{ user_id: ownerId, role: "OWNER" }]);
    });

    it("leaves nothing behind when the owner does not exist (all or nothing)", async () => {
      const ghost = "00000000-0000-4000-8000-000000000000";

      await expect(
        db.companies.create(
          { country: "EE", registryCode: "12345678", name: "Syncpoly OÜ" },
          ghost,
        ),
      ).rejects.toThrow();

      expect(await count("companies")).toBe(0);
      expect(await count("memberships")).toBe(0);
    });

    it("translates a duplicate (country, registry code) into a domain error", async () => {
      const ownerId = await insertUser();
      await insertCompany(ownerId, { registryCode: "12345678" });

      await expect(
        db.companies.create(
          { country: "EE", registryCode: "12345678", name: "Copy OÜ" },
          ownerId,
        ),
      ).rejects.toMatchObject({ code: "COMPANY_ALREADY_EXISTS" });
      expect(await count("companies")).toBe(1);
    });
  });

  describe("findForUser", () => {
    it("finds the user's company by id", async () => {
      const me = await insertUser();
      const id = await insertCompany(me);

      expect(await db.companies.findForUser(me, { id })).toMatchObject({
        id,
        registryCode: "12345678",
      });
    });

    it("finds the user's company by country and registry code", async () => {
      const me = await insertUser();
      const id = await insertCompany(me);

      expect(
        await db.companies.findForUser(me, {
          country: "EE",
          registryCode: "12345678",
        }),
      ).toMatchObject({ id });
    });

    it("does not find a company the user is not a member of", async () => {
      const owner = await insertUser("Owner");
      const stranger = await insertUser("Stranger");
      const id = await insertCompany(owner);

      expect(await db.companies.findForUser(stranger, { id })).toBeNull();
      expect(
        await db.companies.findForUser(stranger, {
          country: "EE",
          registryCode: "12345678",
        }),
      ).toBeNull();
    });
  });

  describe("listForUser", () => {
    it("returns only the user's companies, ordered by name", async () => {
      const me = await insertUser("Me");
      const other = await insertUser("Other");
      await insertCompany(me, { name: "Zeta OÜ", registryCode: "12345678" });
      await insertCompany(me, { name: "Alpha OÜ", registryCode: "10422334" });
      await insertCompany(other, {
        name: "Not mine OÜ",
        registryCode: "12417834",
      });

      const list = await db.companies.listForUser(me, {
        includeArchived: false,
      });

      expect(list.map((c) => c.name)).toEqual(["Alpha OÜ", "Zeta OÜ"]);
    });

    it("hides archived companies unless asked", async () => {
      const me = await insertUser();
      await insertCompany(me, { name: "Live OÜ", registryCode: "12345678" });
      await insertCompany(me, {
        name: "Old OÜ",
        registryCode: "10422334",
        archived: true,
      });

      expect(
        (await db.companies.listForUser(me, { includeArchived: false })).map(
          (c) => c.name,
        ),
      ).toEqual(["Live OÜ"]);
      expect(
        (await db.companies.listForUser(me, { includeArchived: true })).map(
          (c) => c.name,
        ),
      ).toEqual(["Live OÜ", "Old OÜ"]);
    });

    it("refuses to load a row whose country the domain does not support", async () => {
      const me = await insertUser();
      await insertCompany(me, { country: "LV" }); // the database allows it; the domain does not (yet)

      await expect(
        db.companies.listForUser(me, { includeArchived: false }),
      ).rejects.toMatchObject({
        code: "UNSUPPORTED_COUNTRY",
      });
    });
  });

  describe("archive", () => {
    it("sets archivedAt, keeps the row, and returns the updated company", async () => {
      const me = await insertUser();
      const id = await insertCompany(me);
      const at = new Date("2026-10-24T09:00:00Z");

      const archived = await db.companies.archive(id, at);

      expect(archived.archivedAt).toEqual(at);
      expect(await count("companies")).toBe(1);
    });
  });

  describe("what the database itself guarantees", () => {
    it("treats the same registry code in different countries as different companies", async () => {
      const me = await insertUser();
      await insertCompany(me, { country: "EE", registryCode: "12345678" });

      await expect(
        insertCompany(me, { country: "LV", registryCode: "12345678" }),
      ).resolves.toBeTruthy();
    });

    it("refuses to delete a user who still has companies (foreign key restrict)", async () => {
      const me = await insertUser();
      await insertCompany(me);

      await expect(
        sql.query("DELETE FROM users WHERE id = $1", [me]),
      ).rejects.toThrow(/foreign key/i);
    });
  });
});
