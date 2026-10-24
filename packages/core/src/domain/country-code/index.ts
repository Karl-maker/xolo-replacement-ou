import { DomainError } from "../errors/index.js";

// Countries the product has rules for. Adding one later means: add it here, add its
// registry-code rule in registry-code.ts, and every use case keeps working unchanged.
export const SUPPORTED_COUNTRIES = ["EE"] as const;

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number];

/** Parses user input into an ISO 3166-1 alpha-2 code we have rules for. */
export function parseCountryCode(input: string): CountryCode {
  const code = input.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) {
    throw new DomainError(
      "INVALID_COUNTRY_CODE",
      `"${input}" is not a two-letter country code (for example EE).`,
      {
        input,
      },
    );
  }

  if (!(SUPPORTED_COUNTRIES as readonly string[]).includes(code)) {
    throw new DomainError(
      "UNSUPPORTED_COUNTRY",
      `Country "${code}" is not supported yet. Supported: ${SUPPORTED_COUNTRIES.join(", ")}.`,
      { country: code, supported: [...SUPPORTED_COUNTRIES] },
    );
  }

  return code as CountryCode;
}
