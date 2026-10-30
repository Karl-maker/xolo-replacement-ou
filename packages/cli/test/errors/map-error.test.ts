import { describe, expect, it } from "vitest";
import { DomainError, type DomainErrorCode } from "@ou-manager/core";
import { CliError } from "../../src/errors/cli-error.js";
import { mapError } from "../../src/errors/map-error.js";

const EXPECTED: Record<DomainErrorCode, { code: string; exit: number }> = {
  INVALID_COUNTRY_CODE: { code: "USAGE", exit: 2 },
  INVALID_REGISTRY_CODE: { code: "USAGE", exit: 2 },
  INVALID_NAME: { code: "USAGE", exit: 2 },
  USER_NOT_FOUND: { code: "NOT_FOUND", exit: 3 },
  COMPANY_NOT_FOUND: { code: "NOT_FOUND", exit: 3 },
  USER_ALREADY_EXISTS: { code: "CONFLICT", exit: 5 },
  COMPANY_ALREADY_EXISTS: { code: "CONFLICT", exit: 5 },
  FORBIDDEN: { code: "FORBIDDEN", exit: 4 },
};

describe("mapError", () => {
  it.each(Object.entries(EXPECTED))(
    "maps core's %s",
    (domainCode, expected) => {
      const mapped = mapError(
        new DomainError(domainCode as DomainErrorCode, "msg", { x: 1 }),
      );

      expect(mapped.info).toMatchObject({
        code: expected.code,
        message: "msg",
        details: { x: 1, domainCode },
      });
      expect(mapped.exitCode).toBe(expected.exit);
    },
  );

  it("passes a CliError through unchanged", () => {
    const original = new CliError({ code: "CONFIG", message: "bad config" });

    expect(mapError(original)).toBe(original);
  });

  it("wraps anything else as INTERNAL, keeping the original as the cause", () => {
    const boom = new Error("boom");
    const mapped = mapError(boom);

    expect(mapped).toMatchObject({
      exitCode: 1,
      info: { code: "INTERNAL", message: "Unexpected error: boom" },
    });
    expect(mapped.cause).toBe(boom);
  });

  it("copes with things that are not Error objects", () => {
    expect(mapError("just a string").info.message).toBe(
      "Unexpected error: just a string",
    );
  });
});
