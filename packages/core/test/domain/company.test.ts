import { describe, expect, it } from "vitest";
import { parseName } from "../../src/domain/company/index.js";
import { DomainError } from "../../src/domain/errors/index.js";

describe("Company name", () => {
  it.each(["Acme", "Acme Ltd", "Company 123", "Éducation Caraïbes"])(
    "accepts the valid name %s",
    (name) => {
      expect(parseName(name, "company")).toBe(name);
    },
  );

  it("trims leading and trailing whitespace", () => {
    expect(parseName("  Acme Ltd  ", "company")).toBe("Acme Ltd");
  });

  it("collapses consecutive whitespace into a single space", () => {
    expect(parseName("Acme   Caribbean\tLimited", "company")).toBe(
      "Acme Caribbean Limited",
    );
  });

  it("normalizes whitespace containing newlines", () => {
    expect(parseName("Acme\nCaribbean\r\nLimited", "company")).toBe(
      "Acme Caribbean Limited",
    );
  });

  it("accepts a name with exactly 200 characters", () => {
    const name = "A".repeat(200);

    expect(parseName(name, "company")).toBe(name);
  });

  it("rejects a name longer than 200 characters", () => {
    const name = "A".repeat(201);

    expect(() => parseName(name, "company")).toThrowError(
      expect.objectContaining({ code: "INVALID_NAME" }),
    );

    expect(() => parseName(name, "company")).toThrow(
      "The company name must be 1 to 200 characters.",
    );
  });

  it.each(["", " ", "   ", "\t\n\r"])(
    "rejects an empty or whitespace-only name",
    (name) => {
      expect(() => parseName(name, "company")).toThrowError(
        expect.objectContaining({ code: "INVALID_NAME" }),
      );

      expect(() => parseName(name, "company")).toThrow(
        "The company name must be 1 to 200 characters.",
      );
    },
  );

  it("includes the original input in the DomainError", () => {
    const input = "   ";

    try {
      parseName(input, "company");
      expect.fail("Expected parseName to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toMatchObject({
        code: "INVALID_NAME",
        details: { input },
      });
    }
  });

  it("uses the supplied entity description in the error message", () => {
    expect(() => parseName(" ", "customer")).toThrow(
      "The customer name must be 1 to 200 characters.",
    );
  });
});
