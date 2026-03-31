-- Backfill NULL organization_id values to 1 (default org) before applying NOT NULL constraint.
-- Run this BEFORE `pnpm db:push` to avoid constraint violations.
--
-- Usage:
--   psql $DATABASE_URL -f db/migrations/backfill-org-id.sql

BEGIN;

UPDATE org_units SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE users SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE source_roles SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE consolidated_groups SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE personas SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE target_roles SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE releases SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE sod_rules SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE audit_log SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE app_users SET organization_id = 1 WHERE organization_id IS NULL;
UPDATE mapping_feedback SET organization_id = 1 WHERE organization_id IS NULL;

COMMIT;
