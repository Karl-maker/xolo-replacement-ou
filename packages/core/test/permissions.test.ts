import { describe, expect, it } from "vitest";
import {
  createPermission,
  isPermission,
  parsePermission,
} from "../src/domain/permissions/index.js";

describe("Permissions", () => {
  describe("isPermission", () => {
    it.each(["companies:read", "companies:write"])(
      "accepts the valid permission %s",
      (permission) => {
        expect(isPermission(permission)).toBe(true);
      },
    );

    it.each([
      "",
      "companies",
      "companies:update",
      "users:read",
      "companies:",
      ":read",
      "companies:read:extra",
      "companies:read:",
      " companies:read",
      "companies:read ",
      "COMPANIES:read",
      "companies:READ",
    ])("rejects the invalid permission %s", (permission) => {
      expect(isPermission(permission)).toBe(false);
    });

    it.each([null, undefined, 123, true, {}, [], ["companies:read"]])(
      "rejects non-string values: %s",
      (value) => {
        expect(isPermission(value)).toBe(false);
      },
    );
  });

  describe("parsePermission", () => {
    it.each(["companies:read", "companies:write", "companies:delete"])(
      "parses the valid permission %s",
      (permission) => {
        expect(parsePermission(permission)).toBe(permission);
      },
    );

    it.each([
      "companies:update",
      "users:read",
      "companies:read:extra",
      "",
      null,
      undefined,
      123,
    ])("throws a TypeError for invalid permission %s", (value) => {
      expect(() => parsePermission(value)).toThrow(TypeError);
    });

    it("includes the invalid value in the error message", () => {
      expect(() => parsePermission("companies:update")).toThrow(
        "Invalid permission: companies:update",
      );
    });
  });

  describe("createPermission", () => {
    it("creates a read permission", () => {
      expect(createPermission("companies", "read")).toBe("companies:read");
    });

    it("creates a write permission", () => {
      expect(createPermission("companies", "write")).toBe("companies:write");
    });

    it("creates a delete permission", () => {
      expect(createPermission("companies", "delete")).toBe("companies:delete");
    });
  });
});
