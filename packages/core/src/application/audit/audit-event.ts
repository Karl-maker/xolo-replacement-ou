import type { Actor } from "../../domain/actor/index.js";

/**
 * Stable names for facts in the business audit trail. These are an API: do not
 * rename an existing value after it has been stored; introduce a new one instead.
 */
export const AUDIT_ACTION = {
  companyCreated: "company.created",
  companyArchived: "company.archived",
} as const;

export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

/** Information supplied by an adapter about one command, request, or job run. */
export interface AuditContext {
  /** Groups every audit event and operational log from one external invocation. */
  correlationId: string;
  /** The adapter that initiated the work, not a user-controlled value. */
  source: "cli" | "web" | "job" | "api";
  /** How a CLI identity was selected. Omitted for non-CLI adapters. */
  actorSource?: "flag" | "env" | "config" | "session" | "service";
}

export type AuditOutcome = "succeeded" | "rejected" | "failed";

/** A deliberately small JSON shape: audit payloads must be allow-listed and bounded. */
export type AuditChanges = Record<
  string,
  string | number | boolean | null | readonly string[]
>;

/** The complete, domain-level description of an event before persistence. */
export interface AuditEventDraft {
  occurredAt: Date;
  companyId: string | null;
  actor: Actor;
  action: AuditAction;
  outcome: AuditOutcome;
  resource: { type: "company"; id: string };
  context: AuditContext;
  /** Never place credentials, document contents, bank data, or unrestricted input here. */
  changes?: AuditChanges | undefined;
}
