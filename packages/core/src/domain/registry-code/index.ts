import { DomainError } from "../errors/index.js";

// Registration identifiers vary widely by jurisdiction and company type. They
// are optional, and this service does not impose country-specific formats.
export type RegistryCode = string;

const MAX_REGISTRY_CODE_LENGTH = 200;

/** Validates an explicitly supplied registration identifier without rewriting it. */
export function parseRegistryCode(input: string): RegistryCode {
  const code = input.trim();
  if (code.length === 0 || code.length > MAX_REGISTRY_CODE_LENGTH) {
    throw new DomainError(
      "INVALID_REGISTRY_CODE",
      "A registration number must be 1 to 200 characters when supplied.",
      { input },
    );
  }
  return code;
}

/** Registration numbers are optional; omit one when it is unavailable or inapplicable. */
export function parseOptionalRegistryCode(
  input: string | undefined,
): RegistryCode | null {
  return input === undefined ? null : parseRegistryCode(input);
}
