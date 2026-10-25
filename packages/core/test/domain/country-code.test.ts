import { describe, expect, it } from "vitest";
import { parseCountryCode } from "../../src/domain/country-code/index.js";
import { DomainError } from "../../src/domain/errors/index.js";

describe("Country code", () => {
  it("accepts the supported country code EE", () => {
    expect(parseCountryCode("EE")).toBe("EE");
  });

  it("trims surrounding whitespace", () => {
    expect(parseCountryCode(" EE ")).toBe("EE");
  });

  it("normalizes lowercase input to uppercase", () => {
    expect(parseCountryCode("ee")).toBe("EE");
  });

  it("normalizes mixed-case input to uppercase", () => {
    expect(parseCountryCode("eE")).toBe("EE");
  });

  it.each(["", " ", "E", "EEE", "123", "E1", "1E", "EE1", "E-E", "E E", "éE"])(
    "rejects invalid country code format: %s",
    (input) => {
      expect(() => parseCountryCode(input)).toThrowError(
        expect.objectContaining({ code: "INVALID_COUNTRY_CODE" }),
      );
    },
  );

  it("includes the original input in the invalid format error", () => {
    const input = " e ";

    expect(() => parseCountryCode(input)).toThrowError(
      expect.objectContaining({
        code: "INVALID_COUNTRY_CODE",
        details: { input },
      }),
    );
  });

  it("includes an explanatory message for invalid format", () => {
    expect(() => parseCountryCode("EST")).toThrow(
      '"EST" is not a two-letter country code (for example EE).',
    );
  });

  it.each(["US", "GB", "JM", "TT", "LV", "DE"])(
    "rejects unsupported country code %s",
    (input) => {
      expect(() => parseCountryCode(input)).toThrowError(
        expect.objectContaining({ code: "UNSUPPORTED_COUNTRY" }),
      );
    },
  );

  it("normalizes unsupported country codes before rejecting them", () => {
    expect(() => parseCountryCode(" us ")).toThrow(
      'Country "US" is not supported yet. Supported: EE.',
    );
  });

  it("includes the normalized country and supported countries in error metadata", () => {
    try {
      parseCountryCode("us");
      expect.fail("Expected parseCountryCode to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toMatchObject({
        code: "UNSUPPORTED_COUNTRY",
        details: {
          country: "US",
          supported: ["EE"],
        },
      });
    }
  });

  it("distinguishes invalid format from unsupported country", () => {
    expect(() => parseCountryCode("USA")).toThrowError(
      expect.objectContaining({ code: "INVALID_COUNTRY_CODE" }),
    );

    expect(() => parseCountryCode("US")).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_COUNTRY" }),
    );
  });
});
