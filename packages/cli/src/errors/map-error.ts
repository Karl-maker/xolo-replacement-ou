import { DomainError, type DomainErrorCode } from "@ou-manager/core";
import type { ErrorCode } from "./codes.js";
import { CliError } from "./cli-error.js";

// The ONLY place that knows how core's errors become CLI errors.
// Typing the table as Record<DomainErrorCode, ...> means adding a new domain error in core
// fails the build here until it is mapped.
const FROM_DOMAIN: Record<DomainErrorCode, ErrorCode> = {
  INVALID_COUNTRY_CODE: "USAGE",
  UNSUPPORTED_COUNTRY: "USAGE",
  INVALID_REGISTRY_CODE: "USAGE",
  INVALID_NAME: "USAGE",
  USER_NOT_FOUND: "NOT_FOUND",
  COMPANY_NOT_FOUND: "NOT_FOUND",
  USER_ALREADY_EXISTS: "CONFLICT",
  COMPANY_ALREADY_EXISTS: "CONFLICT",
  FORBIDDEN: "FORBIDDEN",
};

const HINTS: Partial<Record<DomainErrorCode, string>> = {
  USER_NOT_FOUND: "Run `oum user list` to see the users.",
  COMPANY_NOT_FOUND: "Run `oum company list` to see your companies.",
  COMPANY_ALREADY_EXISTS:
    "Run `oum company show <registry-code>` to look at it.",
};

export function mapError(error: unknown): CliError {
  if (error instanceof CliError) return error;

  if (error instanceof DomainError) {
    return new CliError({
      code: FROM_DOMAIN[error.code],
      message: error.message,
      hint: HINTS[error.code],
      details: { ...error.details, domainCode: error.code },
      cause: error,
    });
  }

  const message = error instanceof Error ? error.message : String(error);
  return new CliError({
    code: "INTERNAL",
    message: `Unexpected error: ${message}`,
    hint: "Run again with --debug for details.",
    cause: error,
  });
}
