// Runs once, in the main process, BEFORE any test file. If anything is wrong, nothing runs.
import pg from "pg";
import { assertTestDatabaseUrl } from "./assert-test-database.js";

// Vitest 5.0.5 crashes while pretty-printing an error thrown from globalSetup (it fails reading a
// source map) and the real message is lost. So we print it ourselves, then fail with a stack-less error.
export default async function setup(): Promise<void> {
  try {
    await checkTestDatabase();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `\n\u2716 Integration tests did not start.\n  ${message.replace(/\n/g, "\n  ")}\n`,
    );
    const quiet = new Error(
      "Integration tests did not start (see message above).",
    );
    quiet.stack = quiet.message;
    throw quiet;
  }
}

async function checkTestDatabase(): Promise<void> {
  const testUrl = assertTestDatabaseUrl(
    process.env["TEST_DATABASE_URL"],
    process.env["DATABASE_URL"],
  );

  const client = new pg.Client({ connectionString: testUrl });
  try {
    await client.connect();
  } catch (error) {
    throw new Error(
      `Cannot reach the test database. Start it with "pnpm db:up:test", then run "pnpm db:migrate:test".\n${String(error)}`,
    );
  }

  try {
    // Do not trust the URL: ask the server which database we are really connected to.
    const { rows } = await client.query<{ db: string }>(
      "SELECT current_database() AS db",
    );
    const connected = rows[0]?.db ?? "";
    if (!connected.endsWith("_test")) {
      throw new Error(
        `Connected to "${connected}", which is not a test database. Refusing to run.`,
      );
    }

    // The schema must come from the real migrations: `pnpm db:migrate:test`.
    const { rows: tables } = await client.query<{ name: string }>(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)",
      [["users", "companies", "memberships"]],
    );
    if (tables.length !== 3) {
      throw new Error(
        'The test database has no schema yet. Run "pnpm db:migrate:test" first.',
      );
    }
  } finally {
    await client.end();
  }
}
