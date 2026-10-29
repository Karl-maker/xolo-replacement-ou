import {
  assertCan,
  subjectUserId,
  type Actor,
} from "../../domain/actor/index.js";
import type { Company } from "../../domain/company/index.js";
import { parseName } from "../../domain/company/index.js";
import { parseCountryCode } from "../../domain/country-code/index.js";
import { DomainError } from "../../domain/errors/index.js";
import { parseRegistryCode } from "../../domain/registry-code/index.js";
import { AUDIT_ACTION, type AuditContext } from "../audit/audit-event.js";
import type { CompanyRepository } from "../ports/company-repository.js";
import type { TransactionRunner } from "../ports/transaction-runner.js";
import type { UserRepository } from "../ports/user-repository.js";

export interface AddCompanyInput {
  actor: Actor;
  name: string;
  registryCode: string;
  country: string;
  audit: AuditContext;
}

export const addCompany =
  (deps: {
    companies: CompanyRepository;
    users: UserRepository;
    transactions: TransactionRunner;
    clock: () => Date;
  }) =>
  async (input: AddCompanyInput): Promise<Company> => {
    // 1. May this actor do this at all?
    assertCan(input.actor, "companies:write");

    // 2. Validate and normalise everything first: no database work for bad input.
    const country = parseCountryCode(input.country);
    const registryCode = parseRegistryCode(country, input.registryCode);
    const name = parseName(input.name, "company");

    // 3. The company is owned by the person the actor represents.
    const ownerId = subjectUserId(input.actor);
    return deps.transactions.run(async ({ users, companies, audit }) => {
      const owner = await users.findById(ownerId);
      if (!owner)
        throw new DomainError(
          "USER_NOT_FOUND",
          `No user with id "${ownerId}".`,
          {
            id: ownerId,
          },
        );

      // Persist and record the fact together. If auditing fails, the transaction rolls back.
      const company = await companies.create(
        { country, registryCode, name },
        owner.id,
      );
      await audit.append({
        occurredAt: deps.clock(),
        companyId: company.id,
        actor: input.actor,
        action: AUDIT_ACTION.companyCreated,
        outcome: "succeeded",
        resource: { type: "company", id: company.id },
        context: input.audit,
        changes: {
          country: company.country,
          registryCode: company.registryCode,
          name: company.name,
          ownerId: owner.id,
        },
      });
      return company;
    });
  };
