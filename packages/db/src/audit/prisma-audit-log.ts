import type { AuditEventDraft, AuditLog } from "@ou-manager/core";
import {
  AuditActorKind,
  AuditOutcome,
  type PrismaClient,
} from "../generated/client.js";

type AuditPrisma = Pick<PrismaClient, "auditEvent">;

/** PostgreSQL implementation of core's append-only business-audit port. */
export class PrismaAuditLog implements AuditLog {
  constructor(private readonly prisma: AuditPrisma) {}

  async append(event: AuditEventDraft): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        occurredAt: event.occurredAt,
        companyId: event.companyId,
        actorKind:
          event.actor.kind === "user"
            ? AuditActorKind.USER
            : AuditActorKind.AGENT,
        actorId:
          event.actor.kind === "user"
            ? event.actor.userId
            : event.actor.agentId,
        onBehalfOfId:
          event.actor.kind === "agent" ? event.actor.onBehalfOf : null,
        action: event.action,
        outcome: outcome(event.outcome),
        resourceType: event.resource.type,
        resourceId: event.resource.id,
        correlationId: event.context.correlationId,
        source: event.context.source,
        actorSource: event.context.actorSource ?? null,
        ...(event.changes === undefined ? {} : { changes: event.changes }),
      },
    });
  }
}

function outcome(value: AuditEventDraft["outcome"]): AuditOutcome {
  if (value === "succeeded") return AuditOutcome.SUCCEEDED;
  if (value === "rejected") return AuditOutcome.REJECTED;
  return AuditOutcome.FAILED;
}
