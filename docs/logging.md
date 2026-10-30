# Logging and audit trail

This project has two intentionally separate records. They solve different
problems and must not be substituted for one another.

| Record              | Purpose                                                                              | Storage                                                    | Retention and access                                     |
| ------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------- |
| Product audit trail | Reconstruct who made an important learning-content or access change and what changed | PostgreSQL `audit_events`                                  | Restricted, purpose-led retention; append only           |
| Operational logs    | Diagnose commands, jobs, failures, latency and infrastructure                        | JSON Lines on stderr, collected by the deployment platform | Shorter operational retention; never the source of truth |

## Audit API

`@ou-manager/core` owns the meaning of audit events. Adapters supply an
`AuditContext`; database code only persists the resulting `AuditEventDraft`.

```ts
import { AUDIT_ACTION, type AuditContext } from "@ou-manager/core";

const audit: AuditContext = {
  correlationId: "one-id-per-command-request-or-job",
  source: "cli",
  actorSource: "config",
};

await core.companies.archive({ actor, ref, country, audit });
```

`correlationId` is generated at the outer adapter boundary. It links one audit
event to structured logs, traces, a job run, and any later events caused by it.
It must not be a user-provided value. `actorSource` records how a CLI identity
was selected, not an authentication secret.

### Adding a new audited write

1. Add a permanent action name to `AUDIT_ACTION`. Stored action names are a
   public data API: never rename one; add a new name instead.
2. Make the mutating use case accept `audit: AuditContext`.
3. Run the business write and `audit.append()` inside `TransactionRunner.run()`.
   A failed audit insert must roll back the business write.
4. Keep `changes` allow-listed, small, and meaningful. Prefer record IDs,
   state names, version IDs, and hashes over document contents or raw input.
5. Add unit tests for event meaning and a database integration test for storage.

The current implementation records the actions it supports. As Edu Service adds
learning content, sharing, and interaction workflows, give each meaningful
write a stable action name and follow the process above. Rejected authorization
attempts and sensitive reads are planned event categories; do not pretend an
operational error message is an audit entry.

## Database rules

The Prisma migration creates `audit_events`, useful indexes, and an
`UPDATE`/`DELETE`-rejecting PostgreSQL trigger. The application database role
should receive `SELECT` and `INSERT` only for this table. The trigger protects
against accidental privileged writes; it is not a substitute for separate
administrative access control, backups, and protected exports.

Audit payloads must never contain passwords, access tokens, PINs, connection
strings, bank-account data, full document content, or unbounded request bodies.
Audit readers and audit exports are themselves sensitive operations and should
be audited when those features are introduced.

## Operational logs

The CLI's dependency-free logger produces newline-delimited JSON on **stderr**
when `OUM_LOG_JSON=1`. It never writes to stdout, preserving both human command
output and `--json` responses.

```sh
OUM_LOG_JSON=1 oum --help
```

Example record:

```json
{
  "timestamp": "2026-10-29T09:00:00.000Z",
  "level": "info",
  "event": "command.completed",
  "command": "company add",
  "correlationId": "..."
}
```

Only bounded, allow-listed diagnostics belong in this stream: event name,
component, duration, error code, correlation ID, and safe resource IDs. Do not
log command input, request bodies, credentials, tokens, or document contents.
Production services should ship stderr to a centralized collector and propagate
the correlation ID into OpenTelemetry traces.

## Why the separation matters

Operational logs can be sampled, rotated, delayed, or unavailable without
blocking a command. An audit record is evidence that a state change happened,
so it is written in the same transaction as that change. This distinction keeps
debugging affordable while preserving an accountable business history.
