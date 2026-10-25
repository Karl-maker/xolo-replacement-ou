// Same as prisma.config.ts, but pointed at the TEST database. Used only by `pnpm db:migrate:test`:
//   prisma migrate deploy --config prisma.test.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";
import { assertTestDatabaseUrl } from "./test/support/assert-test-database.js";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: assertTestDatabaseUrl(
      process.env["TEST_DATABASE_URL"],
      process.env["DATABASE_URL"],
    ),
  },
});
