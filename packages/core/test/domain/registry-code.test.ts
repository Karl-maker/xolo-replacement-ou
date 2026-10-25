import { describe, expect, it } from "vitest";
import { parseRegistryCode } from "../../src/domain/registry-code/index.js";
import { DomainError } from "../../src/domain/errors/index.js";

describe("Estonian registry code", () => {
  it.each(["12345678", "10422334", "12417834"])(
    "accepts the valid code %s",
    (code) => {
      expect(parseRegistryCode("EE", code)).toBe(code);
    },
  );

  it("strips spaces and dashes", () => {
    expect(parseRegistryCode("EE", " 1234-5678 ")).toBe("12345678");
  });

  it("strips multiple spaces and dashes throughout the code", () => {
    expect(parseRegistryCode("EE", "1 0-4 2-2 3-3 4")).toBe("10422334");
  });

  it.each([
    ["1234567", "must be exactly 8 digits"],
    ["123456789", "must be exactly 8 digits"],
    ["1234567a", "must be exactly 8 digits"],
    ["abcdefgh", "must be exactly 8 digits"],
    ["1234.678", "must be exactly 8 digits"],
    ["", "must be exactly 8 digits"],
  ])("rejects %s (%s)", (code, reason) => {
    expect(() => parseRegistryCode("EE", code)).toThrowError(
      expect.objectContaining({ code: "INVALID_REGISTRY_CODE" }),
    );

    expect(() => parseRegistryCode("EE", code)).toThrow(reason);
  });

  it.each(["12345679", "10422335", "12417835"])(
    "rejects an invalid check digit in %s",
    (code) => {
      expect(() => parseRegistryCode("EE", code)).toThrowError(
        expect.objectContaining({ code: "INVALID_REGISTRY_CODE" }),
      );

      expect(() => parseRegistryCode("EE", code)).toThrow(
        "has an invalid check digit",
      );
    },
  );

  it("includes the country and original input in error metadata", () => {
    const input = "12345679";

    try {
      parseRegistryCode("EE", input);
      expect.fail("Expected parseRegistryCode to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toMatchObject({
        code: "INVALID_REGISTRY_CODE",
        details: {
          country: "EE",
          input,
        },
      });
    }
  });

  it("includes the country-specific registry label in the error message", () => {
    expect(() => parseRegistryCode("EE", "12345679")).toThrow(
      '"12345679" is not a valid Estonian registry code (registrikood): it has an invalid check digit.',
    );
  });

  it("preserves the original input in the error message after normalization would have occurred", () => {
    const input = " 1234-5679 ";

    expect(() => parseRegistryCode("EE", input)).toThrow(
      `"${input}" is not a valid Estonian registry code (registrikood): it has an invalid check digit.`,
    );
  });

  it("for any 7-digit prefix, exactly one check digit is accepted", () => {
    for (const prefix of [
      "1000000",
      "1234567",
      "1999999",
      "1042233",
      "1241783",
      "1555555",
    ]) {
      const accepted = [...Array(10).keys()].filter((digit) => {
        try {
          parseRegistryCode("EE", `${prefix}${digit}`);
          return true;
        } catch (error) {
          expect(error).toBeInstanceOf(DomainError);
          return false;
        }
      });

      expect(accepted).toHaveLength(1);
    }
  });
});
