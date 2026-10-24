import { describe, expect, it } from "vitest";
import {
  assertCan,
  subjectUserId,
  type Actor,
} from "../src/domain/actor/index.js";
import { DomainError } from "../src/domain/errors/index.js";
import type { Permission } from "../src/domain/permissions/index.js";

describe("Actor", () => {
  describe("subjectUserId", () => {
    it("returns the user ID for a user actor", () => {
      const actor: Actor = {
        kind: "user",
        userId: "user-123",
      };

      expect(subjectUserId(actor)).toBe("user-123");
    });

    it("returns the on-behalf-of user ID for an agent actor", () => {
      const actor: Actor = {
        kind: "agent",
        agentId: "agent-123",
        onBehalfOf: "user-456",
        permissions: ["companies:read"],
      };

      expect(subjectUserId(actor)).toBe("user-456");
    });
  });

  describe("assertCan", () => {
    it("allows a user actor without checking agent permissions", () => {
      const actor: Actor = {
        kind: "user",
        userId: "user-123",
      };

      expect(() => assertCan(actor, "companies:read")).not.toThrow();
      expect(() => assertCan(actor, "companies:write")).not.toThrow();
    });

    it.each([
      "companies:read",
      "companies:write",
    ] as const satisfies readonly Permission[])(
      "allows an agent with the %s permission",
      (permission) => {
        const actor: Actor = {
          kind: "agent",
          agentId: "agent-123",
          onBehalfOf: "user-456",
          permissions: [permission],
        };

        expect(() => assertCan(actor, permission)).not.toThrow();
      },
    );

    it("allows an agent when the requested permission is among several granted permissions", () => {
      const actor: Actor = {
        kind: "agent",
        agentId: "agent-123",
        onBehalfOf: "user-456",
        permissions: ["companies:read", "companies:write"],
      };

      expect(() => assertCan(actor, "companies:write")).not.toThrow();
    });

    it("rejects an agent without the requested permission", () => {
      const actor: Actor = {
        kind: "agent",
        agentId: "agent-123",
        onBehalfOf: "user-456",
        permissions: ["companies:read"],
      };

      expect(() => assertCan(actor, "companies:write")).toThrowError(
        expect.objectContaining({ code: "FORBIDDEN" }),
      );
    });

    it("includes the agent ID and permission in the error message", () => {
      const actor: Actor = {
        kind: "agent",
        agentId: "agent-123",
        onBehalfOf: "user-456",
        permissions: [],
      };

      expect(() => assertCan(actor, "companies:read")).toThrow(
        'Agent "agent-123" is not allowed to do "companies:read".',
      );
    });

    it("includes the agent ID and permission in the DomainError metadata", () => {
      const actor: Actor = {
        kind: "agent",
        agentId: "agent-123",
        onBehalfOf: "user-456",
        permissions: [],
      };

      try {
        assertCan(actor, "companies:read");
        expect.fail("Expected assertCan to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect(error).toMatchObject({
          code: "FORBIDDEN",
          details: {
            agentId: "agent-123",
            permission: "companies:read",
          },
        });
      }
    });

    it("rejects an agent with no permissions", () => {
      const actor: Actor = {
        kind: "agent",
        agentId: "agent-123",
        onBehalfOf: "user-456",
        permissions: [],
      };

      expect(() => assertCan(actor, "companies:read")).toThrowError(
        expect.objectContaining({ code: "FORBIDDEN" }),
      );
    });
  });
});
