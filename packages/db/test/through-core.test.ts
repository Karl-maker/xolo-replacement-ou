// A thin end-to-end check: real Postgres + real repositories, driven through createCore().
// The detailed repository behaviour is tested directly in test/repositories/.
// Needs TEST_DATABASE_URL (see .env.example). Run with: pnpm --filter @ou-manager/db test:integration
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createCore, type Actor } from "@ou-manager/core";
import {
  closeDatabase,
  db,
  resetDatabase,
  sql as admin,
} from "./support/test-db.js";

const core = createCore({ users: db.users, companies: db.companies });

beforeEach(resetDatabase);
afterAll(closeDatabase);

async function newUser(name = "Karl-Johan Bailey"): Promise<Actor> {
  return { kind: "user", userId: (await core.users.add({ name })).id };
}

describe("database", () => {
  it("answers a ping", async () => {
    await expect(db.ping()).resolves.toBeUndefined();
  });
});

describe("users", () => {
  it("creates, lists and finds users; rejects a duplicate email", async () => {
    const created = await core.users.add({
      name: "Karl-Johan Bailey",
      email: "KJ@Example.com",
    });
    expect(created).toMatchObject({
      name: "Karl-Johan Bailey",
      email: "kj@example.com",
    });

    expect(await core.users.list()).toHaveLength(1);
    expect(await core.users.get("karl-johan bailey")).toMatchObject({
      id: created.id,
    });
    expect(await core.users.get(created.id)).toMatchObject({ id: created.id });

    await expect(
      core.users.add({ name: "Other", email: "kj@example.com" }),
    ).rejects.toMatchObject({
      code: "USER_ALREADY_EXISTS",
    });
  });
});

describe("companies", () => {
  it("stores a company with its country and makes the creator its owner", async () => {
    const me = await newUser();
    const company = await core.companies.add({
      actor: me,
      name: "Syncpoly OÜ",
      registryCode: "12345678",
      country: "ee",
    });

    expect(company).toMatchObject({
      country: "EE",
      registryCode: "12345678",
      name: "Syncpoly OÜ",
      archivedAt: null,
    });
    expect(company.id).toMatch(/^[0-9a-f-]{36}$/);

    const rows = await admin.query(
      "SELECT role FROM memberships WHERE company_id = $1",
      [company.id],
    );
    expect(rows.rows).toEqual([{ role: "OWNER" }]);
  });

  it("enforces (country, registry code) uniqueness in the database", async () => {
    const me = await newUser();
    await core.companies.add({
      actor: me,
      name: "Syncpoly OÜ",
      registryCode: "12345678",
      country: "EE",
    });
    await expect(
      core.companies.add({
        actor: me,
        name: "Copy OÜ",
        registryCode: "12345678",
        country: "EE",
      }),
    ).rejects.toMatchObject({ code: "COMPANY_ALREADY_EXISTS" });
  });

  it("refuses lowercase or malformed countries at the database level (check constraint)", async () => {
    await expect(
      admin.query(
        "INSERT INTO companies (id, country, registry_code, name, updated_at) VALUES (gen_random_uuid(), 'ee', '1', 'x', now())",
      ),
    ).rejects.toThrow(/companies_country_format/);
  });

  it("keeps each person's companies separate", async () => {
    const me = await newUser("Me");
    const other = await newUser("Other");
    await core.companies.add({
      actor: me,
      name: "Mine OÜ",
      registryCode: "12345678",
      country: "EE",
    });

    expect(await core.companies.list({ actor: me })).toHaveLength(1);
    expect(await core.companies.list({ actor: other })).toHaveLength(0);
    await expect(
      core.companies.get({ actor: other, ref: "12345678", country: "EE" }),
    ).rejects.toMatchObject({
      code: "COMPANY_NOT_FOUND",
    });
  });

  it("looks up by id or registry code, and archives instead of deleting", async () => {
    const me = await newUser();
    const company = await core.companies.add({
      actor: me,
      name: "Syncpoly OÜ",
      registryCode: "12345678",
      country: "EE",
    });

    expect(
      (await core.companies.get({ actor: me, ref: company.id, country: "EE" }))
        .id,
    ).toBe(company.id);
    expect(
      (await core.companies.get({ actor: me, ref: "12345678", country: "EE" }))
        .id,
    ).toBe(company.id);

    const archived = await core.companies.archive({
      actor: me,
      ref: "12345678",
      country: "EE",
    });
    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(await core.companies.list({ actor: me })).toHaveLength(0);
    expect(
      await core.companies.list({ actor: me, includeArchived: true }),
    ).toHaveLength(1);
  });

  it("lets an agent act for a person only within its permissions", async () => {
    const me = await newUser();
    await core.companies.add({
      actor: me,
      name: "Syncpoly OÜ",
      registryCode: "12345678",
      country: "EE",
    });
    const reader: Actor = {
      kind: "agent",
      agentId: "reporter",
      onBehalfOf: me.kind === "user" ? me.userId : "",
      permissions: ["companies:read"],
    };

    expect(await core.companies.list({ actor: reader })).toHaveLength(1);
    await expect(
      core.companies.archive({ actor: reader, ref: "12345678", country: "EE" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
