import type { AuditEventDraft } from "../audit/audit-event.js";

/**
 * The durable business audit trail. A successful state-changing use case calls
 * this inside its transaction; implementations must append, never update rows.
 */
export interface AuditLog {
  append(event: AuditEventDraft): Promise<void>;
}
