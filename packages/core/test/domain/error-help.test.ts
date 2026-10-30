import { describe, expect, it } from "vitest";
import { getErrorHelp } from "../../src/domain/errors/error-help.js";

describe("getErrorHelp()", () => {
  it("returns the error definition and documentation URL", () => {
    const help = getErrorHelp("INVALID_COUNTRY_CODE", {
      docsBaseUrl: "https://docs.example.com",
    });

    expect(help).toEqual({
      title: "Invalid country code",
      description: "The supplied country code is not valid.",
      resolution:
        "Check the code and use a valid ISO 3166-1 alpha-2 country code.",
      docsPath: "/errors/invalid-country-code",
      docsUrl: "https://docs.example.com/errors/invalid-country-code",
    });
  });

  it("returns undefined for docsUrl when the error has no docsPath", () => {
    const help = getErrorHelp("USER_NOT_FOUND", {
      docsBaseUrl: "https://docs.example.com",
    });

    expect(help.docsUrl).toBeUndefined();
    expect(help.title).toBe("User not found");
  });

  it("returns undefined for docsUrl when no base URL is configured", () => {
    const help = getErrorHelp("INVALID_COUNTRY_CODE");

    expect(help.docsUrl).toBeUndefined();
    expect(help.docsPath).toBe("/errors/invalid-country-code");
  });

  it("preserves the error definition fields", () => {
    const help = getErrorHelp("FORBIDDEN", {
      docsBaseUrl: "https://docs.example.com",
    });

    expect(help.title).toBe("Access denied");
    expect(help.description).toBe(
      "You do not have permission to perform this operation.",
    );
    expect(help.resolution).toBe(
      "Check your permissions or contact an administrator.",
    );
  });
});
