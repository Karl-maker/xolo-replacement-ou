import type { CountryCode } from "../country-code/index.js";
import { DomainError } from "../errors/index.js";
import type { RegistryCode } from "../registry-code/index.js";

export interface Company {
  id: string;
  country: CountryCode;
  registryCode: RegistryCode | null;
  name: string;
  createdAt: Date;
  /** Companies are never deleted (records must be kept for years); they are archived. */
  archivedAt: Date | null;
}

/** What a company looks like before the database has given it an id. */
export interface NewCompany {
  country: CountryCode;
  registryCode: RegistryCode | null;
  name: string;
}

const MAX_NAME_LENGTH = 200;

export function parseName(input: string, what: string): string {
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new DomainError(
      "INVALID_NAME",
      `The ${what} name must be 1 to ${MAX_NAME_LENGTH} characters.`,
      { input },
    );
  }
  return name;
}
