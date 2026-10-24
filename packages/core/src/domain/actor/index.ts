import { DomainError } from "../errors/index.js";
import { type Permission } from "../permissions/index.js";

// WHO is asking. Authentication (proving who you are: passwords, OAuth, tokens, "I am at my own
// laptop") happens in the adapters, outside this package. By the time a request reaches core, it has
// been turned into one of these. Core only decides what that actor is ALLOWED to do.

export type Actor =
  /** A person. Acts with their own memberships (what they own or were given access to). */
  | { kind: "user"; userId: string }
  /** A program (AI agent, integration) acting for a person, with only the permissions it was granted. */
  | {
      kind: "agent";
      agentId: string;
      onBehalfOf: string;
      permissions: readonly Permission[];
    };

/** The person whose data the actor sees: the user themself, or the person an agent acts for. */
export const subjectUserId = (actor: Actor): string =>
  actor.kind === "user" ? actor.userId : actor.onBehalfOf;

export function assertCan(actor: Actor, permission: Permission): void {
  if (actor.kind === "user") return; // a person's reach is limited by their memberships, checked per company
  if (!actor.permissions.includes(permission)) {
    throw new DomainError(
      "FORBIDDEN",
      `Agent "${actor.agentId}" is not allowed to do "${permission}".`,
      {
        agentId: actor.agentId,
        permission,
      },
    );
  }
}
