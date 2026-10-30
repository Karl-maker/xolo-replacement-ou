import pg from "pg";
import { createDatabase } from "../../src/index.js";
import { assertTestDatabaseUrl } from "./assert-test-database.js";

// Shared plumbing for the integration tests. They run against a real Postgres whose schema was
// created by the real migrations (`pnpm db:migrate:test`).
// They read TEST_DATABASE_URL only. DATABASE_URL (development) is never used and is hidden from tests.
const connectionString = assertTestDatabaseUrl(
  process.env["TEST_DATABASE_URL"],
  undefined,
);

/** The code under test: the same entry point production uses. */
export const db = createDatabase({ connectionString });

/** A plain SQL connection used only to arrange and inspect data, independent of the code under test. */
export const sql = new pg.Pool({ connectionString });

export async function resetDatabase(): Promise<void> {
  // Last line of defence before something destructive: ask the server where we really are.
  const { rows } = await sql.query<{ db: string }>(
    "SELECT current_database() AS db",
  );
  if (!rows[0]?.db.endsWith("_test")) {
    throw new Error(
      `Refusing to TRUNCATE: connected to "${rows[0]?.db}", which is not a test database.`,
    );
  }
  await sql.query(
    "TRUNCATE memberships, companies, users RESTART IDENTITY CASCADE",
  );
}

export async function closeDatabase(): Promise<void> {
  await db.close();
  await sql.end();
}

// Arrange helpers: insert rows with SQL so a repository test never depends on another repository method.
export async function insertUser(
  name = "Karl-Johan Bailey",
  email: string | null = null,
): Promise<string> {
  const { rows } = await sql.query<{ id: string }>(
    "INSERT INTO users (id, name, email, updated_at) VALUES (gen_random_uuid(), $1, $2, now()) RETURNING id",
    [name, email],
  );
  return rows[0]!.id;
}

export async function insertCompany(
  ownerId: string,
  overrides: {
    name?: string;
    registryCode?: string | null;
    country?: string;
    archived?: boolean;
  } = {},
): Promise<string> {
  const { rows } = await sql.query<{ id: string }>(
    `INSERT INTO companies (id, country, registry_code, name, archived_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, now()) RETURNING id`,
    [
      overrides.country ?? "EE",
      "registryCode" in overrides ? overrides.registryCode : "12345678",
      overrides.name ?? "Syncpoly OÜ",
      overrides.archived ? new Date("2026-02-01T00:00:00Z") : null,
    ],
  );
  const id = rows[0]!.id;
  await sql.query(
    "INSERT INTO memberships (user_id, company_id, role) VALUES ($1, $2, 'OWNER')",
    [ownerId, id],
  );
  return id;
}
