CREATE TYPE "audit_actor_kind" AS ENUM ('USER', 'AGENT');
CREATE TYPE "audit_outcome" AS ENUM ('SUCCEEDED', 'REJECTED', 'FAILED');

CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID,
    "actor_kind" "audit_actor_kind" NOT NULL,
    "actor_id" TEXT NOT NULL,
    "on_behalf_of_id" UUID,
    "action" TEXT NOT NULL,
    "outcome" "audit_outcome" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actor_source" TEXT,
    "changes" JSONB,
    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "audit_events_company_id_occurred_at_idx" ON "audit_events"("company_id", "occurred_at");
CREATE INDEX "audit_events_resource_type_resource_id_occurred_at_idx" ON "audit_events"("resource_type", "resource_id", "occurred_at");
CREATE INDEX "audit_events_actor_id_occurred_at_idx" ON "audit_events"("actor_id", "occurred_at");
CREATE INDEX "audit_events_correlation_id_idx" ON "audit_events"("correlation_id");

-- A database-level guard catches accidental UPDATE/DELETE by any role that has
-- broader privileges than the application role. Administrators remain governed
-- by operational controls and independently protected exports.
CREATE FUNCTION prevent_audit_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
