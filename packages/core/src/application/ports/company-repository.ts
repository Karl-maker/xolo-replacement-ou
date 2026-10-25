import type { Company, NewCompany } from "../../domain/company/index.js";
import type { CountryCode } from "../../domain/country-code/index.js";
import type { RegistryCode } from "../../domain/registry-code/index.js";

export type CompanyRef =
  { id: string } | { country: CountryCode; registryCode: RegistryCode };

export interface CompanyRepository {
  create(input: NewCompany, ownerId: string): Promise<Company>;

  /** Every read is scoped to a user: a user can only see companies they belong to. */
  findForUser(userId: string, ref: CompanyRef): Promise<Company | null>;
  listForUser(
    userId: string,
    options: { includeArchived: boolean },
  ): Promise<Company[]>;

  archive(id: string, at: Date): Promise<Company>;
}
