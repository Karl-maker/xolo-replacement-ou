import type { CompanyRepository } from "./ports/company-repository.js";
import type { TransactionRunner } from "./ports/transaction-runner.js";
import type { UserRepository } from "./ports/user-repository.js";
import { addCompany } from "./companies/add-company.js";
import { archiveCompany } from "./companies/archive-company.js";
import { getCompany } from "./companies/get-company.js";
import { listCompanies } from "./companies/list-companies.js";
import { addUser } from "./users/add-user.js";
import { getUser } from "./users/get-user.js";
import { listUsers } from "./users/list-users.js";

export interface CoreDeps {
  companies: CompanyRepository;
  users: UserRepository;
  /** Coordinates business writes with append-only audit events. */
  transactions: TransactionRunner;
  /** Injected so tests (and later, ledger locks) never depend on the real clock. */
  clock?: () => Date;
}

/**
 * The single entry point to the business logic. Adapters (CLI, web, jobs) receive a `Core`
 * and call `core.companies.add(...)`; they never import use cases or repositories directly.
 */
export function createCore({
  companies,
  users,
  transactions,
  clock = () => new Date(),
}: CoreDeps) {
  return {
    users: {
      add: addUser(users),
      list: listUsers(users),
      get: getUser(users),
    },
    companies: {
      add: addCompany({ companies, users, transactions, clock }),
      list: listCompanies(companies),
      get: getCompany(companies),
      archive: archiveCompany({ companies, transactions, clock }),
    },
  };
}

export type Core = ReturnType<typeof createCore>;
