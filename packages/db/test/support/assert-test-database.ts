// The single rule that keeps tests away from real data: a test database must be clearly named
// as one, and must not be the same database as the development one.
// Used by the test setup AND by prisma.test.config.ts, so migrations cannot hit dev data either.

function describeTarget(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || "5432",
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
  };
}

export function assertTestDatabaseUrl(
  testUrl: string | undefined,
  devUrl: string | undefined,
): string {
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Tests never fall back to DATABASE_URL.\n" +
        "Set it in packages/db/.env, for example: postgresql://oum_test:oum_test@localhost:5432/oum_test",
    );
  }

  const test = describeTarget(testUrl);

  if (!test.database.endsWith("_test")) {
    throw new Error(
      `Refusing to continue: TEST_DATABASE_URL points at database "${test.database}". ` +
        'A test database name must end in "_test".',
    );
  }

  if (devUrl) {
    const dev = describeTarget(devUrl);
    if (
      dev.host === test.host &&
      dev.port === test.port &&
      dev.database === test.database
    ) {
      throw new Error(
        "Refusing to continue: TEST_DATABASE_URL and DATABASE_URL point at the same database.",
      );
    }
  }

  return testUrl;
}
