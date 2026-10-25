import { InMemoryCompanyRepository } from "./in-memory/in-memory-company-repository.js";
import { InMemoryUserRepository } from "./in-memory/in-memory-user-repository.js";

export const NOW = new Date("2026-10-24T09:00:00Z");

/**
 * Everything a use case can depend on, freshly built.
 * Call it inside each test (or a beforeEach): nothing is shared, so tests cannot affect each other.
 */
export function createFakes() {
  return {
    users: new InMemoryUserRepository(),
    companies: new InMemoryCompanyRepository(),
    clock: () => NOW,
  };
}
