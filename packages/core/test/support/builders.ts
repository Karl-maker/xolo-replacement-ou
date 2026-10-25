import { randomUUID } from "node:crypto";
import type { Actor, Company, Permission, User } from "../../src/index.js";

// Test data builders: a valid object by default, override only what the test is about.
// A test that says aCompany({ archivedAt: someDate }) tells the reader exactly what matters.

export const aUser = (overrides: Partial<User> = {}): User => ({
  id: randomUUID(),
  name: "Karl-Johan Bailey",
  email: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

export const aCompany = (overrides: Partial<Company> = {}): Company => ({
  id: randomUUID(),
  country: "EE",
  registryCode: "12345678", // passes the Estonian check digit
  name: "Syncpoly OÜ",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  archivedAt: null,
  ...overrides,
});

/** The actor for a person. */
export const asUser = (user: Pick<User, "id">): Actor => ({
  kind: "user",
  userId: user.id,
});

/** The actor for an agent working on behalf of a person, with exactly these permissions. */
export const asAgent = (
  onBehalfOf: Pick<User, "id">,
  permissions: Permission[],
): Actor => ({
  kind: "agent",
  agentId: "test-agent",
  onBehalfOf: onBehalfOf.id,
  permissions,
});
