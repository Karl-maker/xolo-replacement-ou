import type { CountryCode } from "../country-code/index.js";
import { DomainError } from "../errors/index.js";

// A registry code identifies a legal entity in its country's business register.
// Each country has its own format, so validation is a table keyed by country code.
interface RegistryCodeRule {
  /** Used only in error messages. */
  label: string;
  /** Returns a short problem description, or null if the cleaned code is valid. */
  check(cleaned: string): string | null;
}

// Estonia: "registrikood", 8 digits, the last one a check digit (the same algorithm as the
// personal ID code). Commercial companies such as an OÜ start with 1.
function estonianCheckDigit(first7: string): number {
  const weights1 = [1, 2, 3, 4, 5, 6, 7];
  const weights2 = [3, 4, 5, 6, 7, 8, 9];
  const sum = (weights: number[]) =>
    [...first7].reduce(
      (total, digit, i) => total + Number(digit) * (weights[i] ?? 0),
      0,
    );

  let check = sum(weights1) % 11;
  if (check === 10) {
    check = sum(weights2) % 11;
    if (check === 10) check = 0;
  }
  return check;
}

const rules: Record<CountryCode, RegistryCodeRule> = {
  EE: {
    label: "Estonian registry code (registrikood)",
    check(code) {
      if (!/^\d{8}$/.test(code)) return "must be exactly 8 digits";
      if (estonianCheckDigit(code.slice(0, 7)) !== Number(code[7]))
        return "has an invalid check digit";
      return null;
    },
  },
};

export type RegistryCode = string;

/** Cleans (strips spaces and dashes) and validates a registry code for the given country. */
export function parseRegistryCode(
  country: CountryCode,
  input: string,
): RegistryCode {
  const rule = rules[country];
  const cleaned = input.replace(/[\s-]/g, "");
  const problem = rule.check(cleaned);

  if (problem !== null) {
    throw new DomainError(
      "INVALID_REGISTRY_CODE",
      `"${input}" is not a valid ${rule.label}: it ${problem}.`,
      {
        country,
        input,
      },
    );
  }

  return cleaned;
}
