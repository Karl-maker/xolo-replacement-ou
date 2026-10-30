import {
  assertCan,
  subjectUserId,
  type Actor,
} from "../../domain/actor/index.js";
import type { Company } from "../../domain/company/index.js";
import { parseCountryCode } from "../../domain/country-code/index.js";
import { DomainError } from "../../domain/errors/index.js";
import { parseRegistryCode } from "../../domain/registry-code/index.js";
import type { CompanyRepository } from "../ports/company-repository.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Finds one of the actor's companies. `ref` is either a company id (UUID)
 * or a registry code, in which case `country` says which register it belongs to.
 */
export const getCompany =
  (companies: CompanyRepository) =>
  async (input: {
    actor: Actor;
    ref: string;
    country: string;
  }): Promise<Company> => {
    assertCan(input.actor, "companies:read");

    const lookup = UUID.test(input.ref)
      ? { id: input.ref }
      : (() => {
          const country = parseCountryCode(input.country);
          return {
            country,
            registryCode: parseRegistryCode(input.ref),
          };
        })();

    const company = await companies.findForUser(
      subjectUserId(input.actor),
      lookup,
    );
    if (!company) {
      throw new DomainError(
        "COMPANY_NOT_FOUND",
        `No company found for "${input.ref}".`,
        { ref: input.ref },
      );
    }
    return company;
  };
