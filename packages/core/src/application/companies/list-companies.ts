import {
  assertCan,
  subjectUserId,
  type Actor,
} from "../../domain/actor/index.js";
import type { Company } from "../../domain/company/index.js";
import type { CompanyRepository } from "../ports/company-repository.js";

export const listCompanies =
  (companies: CompanyRepository) =>
  async (input: {
    actor: Actor;
    includeArchived?: boolean;
  }): Promise<Company[]> => {
    assertCan(input.actor, "companies:read");
    return companies.listForUser(subjectUserId(input.actor), {
      includeArchived: input.includeArchived ?? false,
    });
  };
