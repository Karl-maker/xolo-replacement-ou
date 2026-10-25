// Runs inside every test worker before the tests. It removes the development connection string
// from the environment, so no test (or helper) can reach the dev database even by accident.
delete process.env["DATABASE_URL"];
