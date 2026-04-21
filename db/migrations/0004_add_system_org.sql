-- Migration: add_system_org
-- Date: 2026-04-20
-- Purpose: Reserved organization (id=0, slug='system') used as the tenant
--          for platform-level incidents that have no real customer context
--          (health checks, job-runner dead-letters, webhook-endpoint
--          auto-disable). Replaces the previous "fall back to first org"
--          behavior in lib/incidents/detection.ts.
-- Audit:   Applied via Supabase MCP apply_migration on 2026-04-20 to all
--          three projects:
--            - provisum-prod    (sfwecmjbqhurglcdsmbb)
--            - provisum-demo    (rnglqowkvkpmtsoiinyo)
--            - provisum-sandbox (oqhlkxfcuvmzdpfxxatu)
--          This file backfills the change into source control for SOC 2
--          evidence and for future fresh installs.

INSERT INTO public.organizations (id, name, slug, is_active, created_at, updated_at)
VALUES (0, '__system__', 'system', true, now()::text, now()::text)
ON CONFLICT (id) DO NOTHING;
