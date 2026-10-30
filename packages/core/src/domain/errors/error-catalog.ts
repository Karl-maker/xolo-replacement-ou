import type { DomainErrorCode } from "./errors.js";

export interface ErrorDefinition {
  title: string;
  description: string;
  resolution?: string;
  docsPath?: string;
}

export const ERROR_CATALOG: Record<DomainErrorCode, ErrorDefinition> = {
  INVALID_COUNTRY_CODE: {
    title: "Invalid country code",
    description: "The supplied country code is not valid.",
    resolution:
      "Check the code and use a valid ISO 3166-1 alpha-2 country code.",
    docsPath: "/errors/invalid-country-code",
  },

  INVALID_REGISTRY_CODE: {
    title: "Invalid registry code",
    description: "The registry code does not match the expected format.",
    resolution: "Check the registry's requirements and correct the code.",
    docsPath: "/errors/invalid-registry-code",
  },

  INVALID_NAME: {
    title: "Invalid name",
    description: "The supplied name does not meet validation rules.",
    resolution: "Check the name for missing or invalid characters.",
    docsPath: "/errors/invalid-name",
  },

  USER_NOT_FOUND: {
    title: "User not found",
    description: "The requested user could not be found.",
    resolution: "Verify the identifier and try again.",
  },

  USER_ALREADY_EXISTS: {
    title: "User already exists",
    description: "A user with the supplied identifier already exists.",
    resolution: "Use the existing user or choose a different identifier.",
  },

  COMPANY_NOT_FOUND: {
    title: "Company not found",
    description: "The requested company could not be found.",
    resolution: "Verify the company identifier and try again.",
  },

  COMPANY_ALREADY_EXISTS: {
    title: "Company already exists",
    description: "A company with the supplied identifier already exists.",
    resolution: "Check whether the company has already been registered.",
  },

  FORBIDDEN: {
    title: "Access denied",
    description: "You do not have permission to perform this operation.",
    resolution: "Check your permissions or contact an administrator.",
  },
} satisfies Record<DomainErrorCode, ErrorDefinition>;
