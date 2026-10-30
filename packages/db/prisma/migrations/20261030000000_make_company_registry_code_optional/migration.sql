-- Registration numbers are optional because not every company has one or has it available.
-- The existing (country, registry_code) unique index remains: PostgreSQL allows
-- multiple NULL values while preserving uniqueness for supplied identifiers.
ALTER TABLE "companies" ALTER COLUMN "registry_code" DROP NOT NULL;
