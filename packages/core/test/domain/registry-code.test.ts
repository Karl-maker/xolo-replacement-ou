import { describe, expect, it } from "vitest";
import {
  parseOptionalRegistryCode,
  parseRegistryCode,
} from "../../src/domain/registry-code/index.js";

describe("Company registration number", () => {
  it("is optional", () => {
    expect(parseOptionalRegistryCode(undefined)).toBeNull();
  });

  it("preserves country-specific identifiers without applying a format rule", () => {
    expect(parseRegistryCode("  AB-12 34/XYZ  ")).toBe("AB-12 34/XYZ");
  });

  it.each(["", "   ", "x".repeat(201)])(
    "rejects an invalid supplied identifier",
    (input) => {
      expect(() => parseRegistryCode(input)).toThrowError(
        "A registration number must be 1 to 200 characters when supplied.",
      );
    },
  );
});
