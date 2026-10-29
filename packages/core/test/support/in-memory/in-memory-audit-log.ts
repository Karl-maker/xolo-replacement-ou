import type { AuditEventDraft, AuditLog } from "../../../src/index.js";

/** Test double that exposes appended events for precise assertions. */
export class InMemoryAuditLog implements AuditLog {
  private events: AuditEventDraft[] = [];

  async append(event: AuditEventDraft): Promise<void> {
    this.events.push(event);
  }

  all(): readonly AuditEventDraft[] {
    return this.events;
  }
}
