import { describe, expect, it } from "vitest";
import { ERROR_CATALOG } from "../src/domain/errors/error-catalog.js";
import type { DomainErrorCode } from "../src/domain/errors/errors.js";

describe("ERROR_CATALOG", () => {
  it("defines a valid entry for every domain error code", () => {
    const codes: DomainErrorCode[] = [
      "INVALID_COUNTRY_CODE",
      "UNSUPPORTED_COUNTRY",
      "INVALID_REGISTRY_CODE",
      "INVALID_NAME",
      "USER_NOT_FOUND",
      "USER_ALREADY_EXISTS",
      "COMPANY_NOT_FOUND",
      "COMPANY_ALREADY_EXISTS",
      "FORBIDDEN",
    ];

    for (const code of codes) {
      expect(ERROR_CATALOG[code]).toBeDefined();
      expect(ERROR_CATALOG[code].title).toBeTruthy();
      expect(ERROR_CATALOG[code].description).toBeTruthy();
    }
  });

  it("provides resolution guidance when defined", () => {
    expect(ERROR_CATALOG.INVALID_COUNTRY_CODE.resolution).toBe(
      "Check the code and use a supported country code.",
    );
  });

  it("allows documentation paths to be omitted", () => {
    expect(ERROR_CATALOG.USER_NOT_FOUND.docsPath).toBeUndefined();
    expect(ERROR_CATALOG.USER_ALREADY_EXISTS.docsPath).toBeUndefined();
  });

  it("provides documentation paths for documented errors", () => {
    expect(ERROR_CATALOG.INVALID_COUNTRY_CODE.docsPath).toBe(
      "/errors/invalid-country-code",
    );
  });
});
