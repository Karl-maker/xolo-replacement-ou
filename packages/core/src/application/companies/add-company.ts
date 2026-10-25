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
import type { CompanyRepository } from "../ports/company-repository.js";
import type { UserRepository } from "../ports/user-repository.js";

export interface AddCompanyInput {
  actor: Actor;
  name: string;
  registryCode: string;
  country: string;
}

export const addCompany =
  (deps: { companies: CompanyRepository; users: UserRepository }) =>
  async (input: AddCompanyInput): Promise<Company> => {
    // 1. May this actor do this at all?
    assertCan(input.actor, "companies:write");

    // 2. Validate and normalise everything first: no database work for bad input.
    const country = parseCountryCode(input.country);
    const registryCode = parseRegistryCode(country, input.registryCode);
    const name = parseName(input.name, "company");

    // 3. The company is owned by the person the actor represents.
    const ownerId = subjectUserId(input.actor);
    const owner = await deps.users.findById(ownerId);
    if (!owner)
      throw new DomainError("USER_NOT_FOUND", `No user with id "${ownerId}".`, {
        id: ownerId,
      });

    // 4. Persist. The repository enforces (country, registryCode) uniqueness.
    return deps.companies.create({ country, registryCode, name }, owner.id);
  };
