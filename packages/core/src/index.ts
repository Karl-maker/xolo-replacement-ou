// The public surface of @ou-manager/core. Anything not exported here is private.
export { createCore } from "./application/create-core.js";
export type { Core, CoreDeps } from "./application/create-core.js";

export type {
  CompanyRepository,
  CompanyRef,
} from "./application/ports/company-repository.js";
export type { UserRepository } from "./application/ports/user-repository.js";

export type { Company, NewCompany } from "./domain/company/index.js";
export type { User, NewUser } from "./domain/user/index.js";
export {
  SUPPORTED_COUNTRIES,
  parseCountryCode,
  type CountryCode,
} from "./domain/country-code/index.js";
export { DomainError, type DomainErrorCode } from "./domain/errors/index.js";
export type { Actor } from "./domain/actor/index.js";
export type { Permission } from "./domain/permissions/index.js";
