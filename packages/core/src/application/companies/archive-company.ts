import { assertCan, type Actor } from "../../domain/actor/index.js";
import type { Company } from "../../domain/company/index.js";
import type { CompanyRepository } from "../ports/company-repository.js";
import { getCompany } from "./get-company.js";

export const archiveCompany =
  (deps: { companies: CompanyRepository; clock: () => Date }) =>
  async (input: {
    actor: Actor;
    ref: string;
    country: string;
  }): Promise<Company> => {
    assertCan(input.actor, "companies:write");
    // getCompany also needs "companies:read" and proves the actor may see this company.
    const company = await getCompany(deps.companies)(input);
    return deps.companies.archive(company.id, deps.clock());
  };
