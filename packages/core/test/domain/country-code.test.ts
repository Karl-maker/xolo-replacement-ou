import { describe, expect, it } from "vitest";
import {
  ISO_3166_1_ALPHA_2_CODES,
  parseCountryCode,
} from "../../src/domain/country-code/index.js";

describe("Country code", () => {
  it("contains the complete current ISO 3166-1 alpha-2 set", () => {
    expect(ISO_3166_1_ALPHA_2_CODES).toHaveLength(249);
    expect(ISO_3166_1_ALPHA_2_CODES).toEqual(
      expect.arrayContaining(["EE", "US", "BR", "JP", "ZA", "AX"]),
    );
  });

  it.each([
    ["EE", "EE"],
    [" us ", "US"],
    ["br", "BR"],
    ["JP", "JP"],
  ])("accepts and normalizes %s", (input, expected) => {
    expect(parseCountryCode(input)).toBe(expected);
  });

  it.each(["", "E", "EST", "1A", "??", "EU", "ZZ"])(
    "rejects a non-ISO code %j",
    (input) => {
      expect(() => parseCountryCode(input)).toThrowError(
        `"${input}" is not a valid ISO 3166-1 alpha-2 country code.`,
      );
    },
  );
});
