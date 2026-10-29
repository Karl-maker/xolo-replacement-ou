import { assertCan, type Actor } from "../../domain/actor/index.js";
import type { Company } from "../../domain/company/index.js";
import { AUDIT_ACTION, type AuditContext } from "../audit/audit-event.js";
import type { CompanyRepository } from "../ports/company-repository.js";
import type { TransactionRunner } from "../ports/transaction-runner.js";
import { getCompany } from "./get-company.js";

export const archiveCompany =
  (deps: {
    companies: CompanyRepository;
    transactions: TransactionRunner;
    clock: () => Date;
  }) =>
  async (input: {
    actor: Actor;
    ref: string;
    country: string;
    audit: AuditContext;
  }): Promise<Company> => {
    assertCan(input.actor, "companies:write");
    return deps.transactions.run(async ({ companies, audit }) => {
      // getCompany also needs "companies:read" and proves the actor may see this company.
      const company = await getCompany(companies)(input);
      const archivedAt = deps.clock();
      const archived = await companies.archive(company.id, archivedAt);
      await audit.append({
        occurredAt: archivedAt,
        companyId: archived.id,
        actor: input.actor,
        action: AUDIT_ACTION.companyArchived,
        outcome: "succeeded",
        resource: { type: "company", id: archived.id },
        context: input.audit,
        changes: { archivedAt: archivedAt.toISOString() },
      });
      return archived;
    });
  };
