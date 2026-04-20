# Provisum Support — Integration Source-of-Truth

> **Audience:** the Claude session maintaining the management-suite `tickets` feature.
> **Repo:** `jacobrtaylor19/provisum-app` (working dir locally `airm/`), branch `main`.
> **Status:** read-only investigation — no support code modified.

There are **two distinct "support" surfaces** in this repo. The management suite needs to know which one it's integrating with:

| Surface | Purpose | Persisted to DB? | Has AI triage? |
|---|---|---|---|
| **`incidents`** (the "automated support handling system") | Internal/platform incidents — health, job failures, webhook failures, manual admin entries. AI-triaged by Claude. | **Yes** — `incidents` table | **Yes** |
| **`/api/support`** (in-app user ticket form) | End-user-submitted bugs / feature requests / access issues. Fires email + audit-log only. | **No** (just `audit_log` row) | **No** |

This document covers **both**, but the bulk of section 2 onwards describes the `incidents` table because that is what the memory note "automated support handling system" refers to.

---

## 1. Where the data lives

### Incidents (primary integration target)
- **Storage:** Supabase Postgres, `public.incidents` table. Defined in [db/schema.ts:1007](db/schema.ts:1007) (auto-generated DDL in [db/migrations/0001_slippery_madrox.sql:51](db/migrations/0001_slippery_madrox.sql:51)).
- **ORM:** Drizzle (`postgres-js` driver, pooled connection on port 6543, `prepare: false`). Connection setup at [db/index.ts](db/index.ts). All access is server-side via the connection string in `DATABASE_URL`.
- **Supabase project refs (per environment, from `MEMORY.md`):**
  - demo → `rnglqowkvkpmtsoiinyo` (provisum-demo)
  - prod → `sfwecmjbqhurglcdsmbb` (provisum-prod)
  - sandbox → `oqhlkxfcuvmzdpfxxatu` (provisum-sandbox)
- **Pooler host:** `aws-1-us-east-1.pooler.supabase.com:6543` (transaction-mode pooler).
- **No third-party tool** (no Intercom / Zendesk / HelpScout / Front / Crisp). No message queue. Triage runs inline as a fire-and-forget Promise after insert.

### `/api/support` user-submitted tickets (NOT persisted as rows)
- **No dedicated table.** [app/api/support/route.ts:59](app/api/support/route.ts:59) writes a single `audit_log` entry with `entityType="support"`, `action="support_ticket_created"`, and stuffs `{ ticketNumber, subject, category, priority }` into the `newValue` JSON column.
- It then emails `support@provisum.io` (now `hello@provisum.io` per the email-consolidation note in `MEMORY.md`, but the route file still hard-codes `support@provisum.io` at [app/api/support/route.ts:78](app/api/support/route.ts:78)).
- **Ticket numbers** (`PRV-YYMM-NNNN`) are generated client-side per request with `Math.random` ([app/api/support/route.ts:22-28](app/api/support/route.ts:22)) — they are NOT unique across the database, NOT indexed, and NOT recoverable from the audit log without a JSON LIKE scan.
- This means: if the management suite wants user-submitted tickets, the current data path is "scrape `audit_log WHERE entity_type='support'`" or "subscribe to `support@…` mailbox". Neither is recommended — see Open Questions §9.

---

## 2. Ticket data model

### 2a. Primary table(s)

- **`incidents`** — single table, no joins required for the core record. Defined at [db/schema.ts:1007-1033](db/schema.ts:1007).
- **No comments table, no attachments table, no escalations table** — see §3 and §5.
- DDL ([db/migrations/0001_slippery_madrox.sql:51](db/migrations/0001_slippery_madrox.sql:51)) confirms two FKs: `resolved_by → app_users.id`, `organization_id → organizations.id` ([db/migrations/0001_slippery_madrox.sql:252-253](db/migrations/0001_slippery_madrox.sql:252)).

### 2b. Full field list

Source: [db/schema.ts:1007-1033](db/schema.ts:1007). All `text` columns are stored as Postgres `TEXT` (no length cap at the DB layer; max length is enforced by Zod in the create route — see §6).

| Field (DB / Drizzle) | Postgres type | Nullable | Default | Purpose |
|---|---|---|---|---|
| `id` / `id` | `serial` (int4) PK | NO | auto-increment | Primary key. **Note: integer, not UUID** (deviates from the Cursus alignment rule in `CLAUDE.md`). |
| `title` / `title` | `text` | NO | — | One-line summary (Zod max 500). |
| `description` / `description` | `text` | NO | — | Longer body (Zod max 5000). |
| `severity` / `severity` | `text` | NO | — | Enum-like, see §2c. |
| `status` / `status` | `text` | NO | `'open'` | Enum-like, see §2c. |
| `source` / `source` | `text` | NO | — | Origin channel — see §2c. |
| `source_ref` / `sourceRef` | `text` | YES | `NULL` | External reference (job id, webhook endpoint id, Sentry event id). Used for dedup with `source`. |
| `ai_classification` / `aiClassification` | `text` | YES | `NULL` | **JSON-encoded** AI triage payload (schema below). Parsed by API routes before serving to clients. |
| `ai_triaged_at` / `aiTriagedAt` | `text` | YES | `NULL` | ISO timestamp string when AI triage last completed. `NULL` means triage is queued or never ran. |
| `resolution` / `resolution` | `text` | YES | `NULL` | Free-text admin notes when status moves to `resolved`/`dismissed`. |
| `resolved_by` / `resolvedBy` | `int4` FK → `app_users.id` | YES | `NULL` | Set automatically when PATCH sets status to `resolved` or `dismissed` ([app/api/admin/incidents/[id]/route.ts:105-108](app/api/admin/incidents/[id]/route.ts:105)). |
| `resolved_at` / `resolvedAt` | `text` | YES | `NULL` | ISO timestamp, set with `resolved_by`. |
| `affected_component` / `affectedComponent` | `text` | YES | `NULL` | Free text in the schema; commonly one of `ai_pipeline`, `auth`, `database`, `export`, `integration`. Not enforced at DB. |
| `affected_users` / `affectedUsers` | `int4` | YES | `NULL` | Estimated count of impacted users. |
| `metadata` / `metadata` | `text` | YES | `NULL` | JSON-encoded blob for extra context. Parsed by API routes before serving. |
| `organization_id` / `organizationId` | `int4` FK → `organizations.id` | NO | — | Multi-tenant scope. Every read filters on this. |
| `created_at` / `createdAt` | `text` | NO | `new Date().toISOString()` (Drizzle `$defaultFn`) | ISO timestamp. **Stored as TEXT, not `timestamptz`.** |
| `updated_at` / `updatedAt` | `text` | NO | `new Date().toISOString()` (Drizzle `$defaultFn`) | Updated by every PATCH and by re-triage. Initial value matches `created_at`. |

#### `ai_classification` JSON shape

Populated by [lib/incidents/triage.ts:147-152](lib/incidents/triage.ts:147). Interface declared at [lib/incidents/triage.ts:15-21](lib/incidents/triage.ts:15):

```ts
{
  category: "auth" | "database" | "ai_pipeline" | "export" | "integration"
          | "performance" | "security" | "configuration",  // string in DB; LLM-constrained
  rootCause: string,        // 1-2 sentence root cause
  suggestedFix: string,     // actionable recommendation
  confidence: number,       // 0-100, clamped at lib/incidents/triage.ts:143
  blastRadius: "isolated" | "department" | "organization" | "platform"
}
```

GET routes in §6 unwrap this JSON before responding, so external HTTP consumers see the parsed object, not the raw string.

### 2c. Enum values

These are **CHECK-less text columns** — the DB will accept any string. Constraints are enforced by Zod (POST) and by application code (PATCH). Treat the lists below as canonical.

- **`severity`** — `critical` | `high` | `medium` | `low`
  Enforced by Zod at [lib/validation/admin.ts:91](lib/validation/admin.ts:91); also the type alias `Severity` at [lib/incidents/detection.ts:16](lib/incidents/detection.ts:16).
- **`status`** — `open` | `investigating` | `resolved` | `dismissed`
  Default `open`. Validated by PATCH at [app/api/admin/incidents/[id]/route.ts:90](app/api/admin/incidents/[id]/route.ts:90). Setting `resolved` or `dismissed` auto-populates `resolved_by` + `resolved_at`.
- **`source`** — `sentry` | `health_check` | `job_failure` | `webhook_failure` | `manual`
  Type alias `IncidentSource` at [lib/incidents/detection.ts:17](lib/incidents/detection.ts:17). `sentry` is reserved — there is currently no Sentry → `incidents` ingest hook (see §6).
- **`affected_component`** — informally one of `ai_pipeline` | `auth` | `database` | `export` | `integration`. Not enforced anywhere. Free string in PATCH/POST. Schema comment at [db/schema.ts:1026](db/schema.ts:1026) lists these as examples only.
- **`ai_classification.category`** — `auth` | `database` | `ai_pipeline` | `export` | `integration` | `performance` | `security` | `configuration`. Constrained only by the LLM prompt at [lib/incidents/triage.ts:101](lib/incidents/triage.ts:101).
- **`ai_classification.blastRadius`** — `isolated` | `department` | `organization` | `platform`. Same enforcement.

> There is **no `priority` field** on `incidents`. `severity` is the only ordering signal. The user-ticket form (`/api/support`) has its own `priority` enum (`low` | `medium` | `high`, [app/api/support/route.ts:20](app/api/support/route.ts:20)) but those values do not flow into the `incidents` table.

---

## 3. Comments / conversation storage

**There is no comment system on incidents.** No `incident_comments` table, no JSON array on the row, no thread linkage.

The only "conversation"-shaped table in the repo is `chat_conversations` ([db/schema.ts:1035-1044](db/schema.ts:1035)) which stores Lumen (Anthropic SDK) chat threads scoped to an `app_user.id`. It is **not linked to incidents** in any way.

The closest thing to an audit trail per incident is the global `audit_log` table, but the incident lifecycle (status changes, resolution, retriage) is **not currently audit-logged** — search confirms no `auditLog.insert` calls in any of `app/api/admin/incidents/**`.

If the management suite needs comments, options are:
1. Add an `incident_comments` table on the Provisum side and an API to read/write it (Provisum work).
2. Store comments only on the management-suite side, keyed by Provisum incident id.

---

## 4. Automation flow

End-to-end pipeline for an incident:

1. **Ingestion** — one of the four call sites (see §6) invokes `detectIncident({...})` ([lib/incidents/detection.ts:35](lib/incidents/detection.ts:35)).
2. **Org resolution** — if no `organizationId` was passed, fall back to `id=1` (i.e., the first org). [lib/incidents/detection.ts:38-45](lib/incidents/detection.ts:38). This is fine for single-tenant ingestion paths (health check, job runner) but means **automated incidents land in org 1 by default**.
3. **Deduplication** — two checks, in order ([lib/incidents/detection.ts:47-73](lib/incidents/detection.ts:47)):
   - exact match on `(source, source_ref)` if `source_ref` is provided;
   - exact match on `title` within the last 5 minutes.
   On dedup hit, the existing incident id is returned and **no further action is taken** (no second triage, no second notification).
4. **Insert** — single row insert into `incidents` ([lib/incidents/detection.ts:76-89](lib/incidents/detection.ts:76)).
5. **AI triage (fire-and-forget)** — `triageIncident(id)` is called without `await`; errors are swallowed via `.catch` ([lib/incidents/detection.ts:94-96](lib/incidents/detection.ts:94)).
   - Triage reads the incident + the 10 most recent incidents for context, builds a prompt, calls Claude `claude-sonnet-4-20250514` with `max_tokens: 512` ([lib/incidents/triage.ts:116-120](lib/incidents/triage.ts:116)).
   - Parses JSON (with a fallback regex extraction for markdown-wrapped responses, [lib/incidents/triage.ts:130-140](lib/incidents/triage.ts:130)), clamps `confidence` to 0–100, writes back to `ai_classification` + `ai_triaged_at` + `updated_at`.
   - **If `severity === "critical"`,** also fires an extra notification email to `system_admin` + `admin` roles with the suggested fix ([lib/incidents/triage.ts:157-165](lib/incidents/triage.ts:157)).
6. **Admin notification** — independent of triage, every incident creation fires `notifyUsersWithRoles({ roles: ["system_admin", "admin"], … })` ([lib/incidents/detection.ts:104-112](lib/incidents/detection.ts:104)). This writes a row to the `notifications` table and (if `RESEND_API_KEY` is set) sends an email via Resend.
7. **Human review (manual)** — the only path from `open`/`investigating` to `resolved`/`dismissed` is a human PATCH from the admin UI. **Nothing in the codebase auto-resolves an incident.** AI does not change `status`. There is no SLA timer, no escalation flag column, no auto-assign.
8. **Re-triage (manual)** — admin can clear `ai_classification` and re-run via `POST /api/admin/incidents/[id]/retriage` ([app/api/admin/incidents/[id]/retriage/route.ts:46-56](app/api/admin/incidents/[id]/retriage/route.ts:46)). Note this PATH `await`s `triageIncident` rather than fire-and-forget.

**Failure modes worth knowing:**
- If the LLM call fails or `ANTHROPIC_API_KEY` is missing, `ai_classification` stays `NULL` forever (no retry queue). Triage failure is logged via `reportError` only.
- If `detectIncident`'s top-level try/catch fires, it returns `-1` instead of throwing ([lib/incidents/detection.ts:115-119](lib/incidents/detection.ts:115)) — callers cannot distinguish "deduped" from "failed to insert".

---

## 5. Attachments

**Not supported.** No Supabase Storage integration, no file references in the schema. The only structured extra-context field is `metadata` (JSON text). If the management suite needs to attach a file, today the only option is base64-stuffing into `metadata` (not recommended) or extending the schema.

---

## 6. Existing outbound hooks / APIs

### Inbound — where incidents come from

Four call sites of `detectIncident`, found via codebase grep:

| Source enum | Trigger | File:line |
|---|---|---|
| `health_check` | `GET /api/health` returns `degraded` because the `SELECT 1` probe failed. Severity `critical`, component `database`. | [app/api/health/route.ts:24-30](app/api/health/route.ts:24) |
| `job_failure` | `lib/job-runner.ts` runs out of retries (default 3 total attempts) on a background job. Severity `high`, component `ai_pipeline`, `source_ref` is the job id. | [lib/job-runner.ts:116-123](lib/job-runner.ts:116) |
| `webhook_failure` | A subscribed webhook endpoint hits its 10th consecutive delivery failure and gets auto-disabled. Severity `medium`, component `integration`, `source_ref` is the endpoint id. Two paths (HTTP-error and exception) at [lib/webhooks.ts:157-164](lib/webhooks.ts:157) and [lib/webhooks.ts:186-193](lib/webhooks.ts:186). | `lib/webhooks.ts:157,186` |
| `manual` | Admin POSTs the create form. | [app/api/admin/incidents/route.ts:75-83](app/api/admin/incidents/route.ts:75) |
| `sentry` | **No call site exists.** The enum value is reserved but unused. There is no Sentry webhook handler. | — |

### Outbound — what fires when an incident is created/updated

- **Internal `notifications` table inserts** to `system_admin` + `admin` users (see step 6 in §4).
- **Resend email** to those same users, fire-and-forget. Subject: `[SEVERITY] Incident: <title>`.
- **Critical-only second email** with the AI suggested fix, after triage completes ([lib/incidents/triage.ts:157-165](lib/incidents/triage.ts:157)).
- **No outbound webhooks.** The webhook system at `lib/webhooks.ts` supports 11 event types (`persona.generated`, `mapping.created/approved/rejected`, `sod.analysis_complete/conflict_resolved`, `assignment.status_changed`, `export.completed`, `user.invited`, `job.completed/failed`) — **none of them are `incident.*`**. Search confirms no `dispatchWebhook(...)` call from any incident code path.

So today there is **no push channel** out of Provisum for incidents. The management suite must poll, or Provisum must add an `incident.created`/`incident.updated`/`incident.resolved` event to `lib/webhooks.ts`.

### Existing HTTP API surface (admin-only)

All routes require `getSessionUser()` to return a user whose `role` is `system_admin` or `admin`. They are **session-cookie auth, not API-key auth** — no path for an unattended external system today.

| Method | Route | Body / params | Response | File |
|---|---|---|---|---|
| `GET` | `/api/admin/incidents` | query: `status`, `severity`, `from`, `to`, `limit` (max 200, default 50) | `{ incidents: Incident[] }` with `aiClassification` and `metadata` parsed to objects | [app/api/admin/incidents/route.ts:17](app/api/admin/incidents/route.ts:17) |
| `POST` | `/api/admin/incidents` | Zod ([lib/validation/admin.ts:88-94](lib/validation/admin.ts:88)): `{ title (1..500), description (1..5000), severity, affectedComponent?, metadata? }` | `{ id: number, success: true }` | [app/api/admin/incidents/route.ts:63](app/api/admin/incidents/route.ts:63) |
| `GET` | `/api/admin/incidents/[id]` | — | `{ incident: { ...row, aiClassification: object\|null, metadata: object\|null, resolvedByName: string\|null } }` | [app/api/admin/incidents/[id]/route.ts:14](app/api/admin/incidents/[id]/route.ts:14) |
| `PATCH` | `/api/admin/incidents/[id]` | `{ status?, resolution? }`. `status` ∈ enum. Setting `resolved`/`dismissed` auto-fills `resolved_by` + `resolved_at`. | `{ success: true }` | [app/api/admin/incidents/[id]/route.ts:71](app/api/admin/incidents/[id]/route.ts:71) |
| `POST` | `/api/admin/incidents/[id]/retriage` | — | `{ success: true, incident: {...parsed} }` | [app/api/admin/incidents/[id]/retriage/route.ts:15](app/api/admin/incidents/[id]/retriage/route.ts:15) |

All admin routes scope by `organization_id = getOrgId(user)` (e.g., [app/api/admin/incidents/route.ts:31-32](app/api/admin/incidents/route.ts:31)) — cross-org reads are blocked at the application layer.

### A documented integration convention exists but is not yet wired for incidents

[CLAUDE.md](CLAUDE.md) "Integration API convention" section says external integration endpoints live under `/api/integration/`, are REST + Zod, and **must validate `PROVISUM_API_KEY` in the `Authorization` header**. One example is mentioned (`GET /api/integration/personas` for Cursus). **There is currently no `/api/integration/incidents` route.** Adding one is the recommended path — see §7.

---

## 7. Recommended read path for external systems

> Two viable paths. Pick based on whether the management suite is willing to wait for Provisum to ship a small new route.

### Path A (preferred): add `/api/integration/incidents` on the Provisum side

Follow the convention already declared in `CLAUDE.md`:

- New file: `app/api/integration/incidents/route.ts`.
- Auth: `Authorization: Bearer ${PROVISUM_API_KEY}` header check (timing-safe compare).
- Org scope: management suite passes `?organizationId=N` or an `X-Org-Id` header; the route validates the key has access. Today there is no per-org API-key model, so initially the key would be a **superuser key** that can read any org — call this out explicitly when issuing it.
- Response shape: same as `GET /api/admin/incidents`, with `aiClassification` + `metadata` already parsed to objects.
- Optional `?since=<iso>` parameter for incremental pulls.
- Optional `?include=resolvedByName` to opt into the JOIN that the `[id]` route does.

Why this is preferred:
- Avoids handing out the Supabase service role key (which would let the management suite read or write **any** Provisum table).
- Gives Provisum a place to enforce rate limiting, redaction, and key rotation.
- Matches the documented architecture pattern.

### Path B (fast hack): direct Postgres read with a dedicated read-only role

If we need data flowing in days not weeks:

- Create a Postgres role `mgmt_suite_reader` in the relevant Supabase project(s).
- `GRANT SELECT ON public.incidents TO mgmt_suite_reader;` — nothing else.
- Issue a connection string for that role to the management suite.
- The management suite can then query directly via `postgres-js` / pg / Drizzle.

Caveats:
- The current **service role key bypasses RLS** — that is what Provisum's own API routes use (see [db/index.ts](db/index.ts) and the lockdown note in `db/migrations/0003_rls_deny_all_missing_29_tables.sql`). Do **not** share `SUPABASE_SERVICE_ROLE_KEY` with the management suite.
- The 0003 RLS migration enumerates 29 tables and **does not list `incidents`**. Whether `incidents` has RLS + deny-all policies applied via Supabase MCP after that migration is **not provable from this repo** — the memory note says "RLS + deny-all on all 55 tables (demo)" as of v1.4.1, but there is no migration file that adds them for `incidents`. **Verify in the Supabase dashboard before relying on RLS for isolation** — tracked under §9 Open Questions.

### Anti-pattern (do not do this)
- Sharing `SUPABASE_SERVICE_ROLE_KEY` — unbounded blast radius.
- Reusing a session cookie scraped from a logged-in admin — sessions expire and rotate; not a service-account model.

### Sync cadence + failure handling (recommendation, decide on the MS side)
- For Path A: poll `/api/integration/incidents?since=<last_sync>` on a 60-second cadence; on 5xx, exponential back off, alert after 3 consecutive failures.
- One-way sync only (Provisum → MS) for v1. Bi-directional (MS PATCH-ing status back) needs a write endpoint that does NOT exist today.

---

## 8. Sample rows (redacted)

Real seed data is **not generated** — `db/seed.ts:91` truncates `incidents` but never inserts new rows ([db/seed.ts:90-100](db/seed.ts:90)). The two examples below are constructed from production code paths — `health_check` from [app/api/health/route.ts:24-30](app/api/health/route.ts:24) and `job_failure` from [lib/job-runner.ts:116-123](lib/job-runner.ts:116) — and reflect what the wire format actually looks like when GET returns a row (with `aiClassification` and `metadata` already parsed).

### Example 1 — health-check incident (after AI triage)

```json
{
  "id": 42,
  "title": "Health check: database degraded",
  "description": "Database connectivity check returned status \"error\". The database may be unreachable or experiencing issues.",
  "severity": "critical",
  "status": "investigating",
  "source": "health_check",
  "sourceRef": null,
  "aiClassification": {
    "category": "database",
    "rootCause": "Connection pool exhaustion on the Supabase pooler — the SELECT 1 probe could not acquire a connection within the request timeout.",
    "suggestedFix": "Check the Supabase project dashboard for pooler saturation; verify DATABASE_URL points at the transaction-mode pooler on port 6543; consider raising max connections or scaling compute.",
    "confidence": 80,
    "blastRadius": "platform"
  },
  "aiTriagedAt": "2026-04-20T14:32:15.000Z",
  "resolution": null,
  "resolvedBy": null,
  "resolvedAt": null,
  "affectedComponent": "database",
  "affectedUsers": null,
  "metadata": null,
  "organizationId": 1,
  "createdAt": "2026-04-20T14:30:02.000Z",
  "updatedAt": "2026-04-20T14:32:15.000Z"
}
```

### Example 2 — job-runner dead-letter incident (resolved)

```json
{
  "id": 57,
  "title": "Job failed: 1843",
  "description": "Job 1843 exhausted all 3 retries. Last error: ECONNRESET reading source role permissions",
  "severity": "high",
  "status": "resolved",
  "source": "job_failure",
  "sourceRef": "1843",
  "aiClassification": {
    "category": "ai_pipeline",
    "rootCause": "Transient network error during a long-running persona generation job; retries hit the same upstream timeout.",
    "suggestedFix": "Re-run the failed job from the admin job runner; if it fails again, inspect the source-permission loader for unbounded query results.",
    "confidence": 70,
    "blastRadius": "organization"
  },
  "aiTriagedAt": "2026-04-21T09:01:44.000Z",
  "resolution": "Re-ran the job; completed successfully. Root cause was a brief Supabase blip per status page.",
  "resolvedBy": 12,
  "resolvedAt": "2026-04-21T09:18:02.000Z",
  "affectedComponent": "ai_pipeline",
  "affectedUsers": null,
  "metadata": null,
  "organizationId": 1,
  "createdAt": "2026-04-21T09:00:55.000Z",
  "updatedAt": "2026-04-21T09:18:02.000Z"
}
```

### Example 3 — manual admin-created incident with structured `metadata`

```json
{
  "id": 71,
  "title": "Persona generation slow for large org",
  "description": "Customer reported 30+ minute wait for persona generation on an org with 50k users. No errors, just slow.",
  "severity": "medium",
  "status": "open",
  "source": "manual",
  "sourceRef": null,
  "aiClassification": null,
  "aiTriagedAt": null,
  "resolution": null,
  "resolvedBy": null,
  "resolvedAt": null,
  "affectedComponent": "ai_pipeline",
  "affectedUsers": 50000,
  "metadata": {
    "reportedBy": "user@example.com",
    "customerOrg": "Acme Corp",
    "lastAttemptJobId": 1922
  },
  "organizationId": 1,
  "createdAt": "2026-04-21T16:14:09.000Z",
  "updatedAt": "2026-04-21T16:14:09.000Z"
}
```

> Note: in the raw DB row, `aiClassification` and `metadata` are JSON-encoded `text` columns (e.g. `'{"category":"database",...}'`). The admin GET routes parse them before responding ([app/api/admin/incidents/route.ts:47-51](app/api/admin/incidents/route.ts:47), [app/api/admin/incidents/[id]/route.ts:54-60](app/api/admin/incidents/[id]/route.ts:54)). A direct DB read (Path B in §7) will receive strings, not objects.

---

## 9. Open questions

Things I could not definitively answer from the code alone — the management-suite session should not assume one way or the other.

1. **RLS state on `incidents` in production.** The 0003 RLS migration ([db/migrations/0003_rls_deny_all_missing_29_tables.sql](db/migrations/0003_rls_deny_all_missing_29_tables.sql)) does not include `incidents`. `MEMORY.md` says all 55 tables (demo) and all 55 tables (v1.4.1 prod) have RLS + deny-all, but that was likely applied via Supabase MCP after the migration files were last updated. **Action:** check the Supabase dashboard for `provisum-prod` (`sfwecmjbqhurglcdsmbb`) and confirm `ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY` plus the deny-all policies for `anon` and `authenticated`. If RLS is *not* on, an external read role with `SELECT` granted will work, but the security posture is weaker than memory implies.
2. **Is there a `PROVISUM_API_KEY` env var actually set on prod?** `CLAUDE.md` documents the convention but does not list it in `MEMORY.md`'s "Env Vars" section. Likely needs to be created and stored in Vercel before §7 Path A can ship.
3. **Org-1 fallback.** Health-check incidents always land in org 1 ([lib/incidents/detection.ts:38-45](lib/incidents/detection.ts:38)). For a multi-tenant prod, this means cross-tenant infrastructure incidents may all pool in one org. Decide whether the management suite should treat org 1 as a "system" tenant or whether Provisum should refactor to omit `organizationId` for platform-level incidents.
4. **The `sentry` enum value is unused.** There's no `/api/webhooks/sentry` handler. If Sentry-driven ingestion is part of the integration story, that's net-new work on the Provisum side.
5. **`/api/support` user tickets.** Confirm whether the management suite's `tickets` feature should also surface user-submitted bug reports / feature requests. If yes, today the only data source is `audit_log WHERE entity_type='support'` — clunky. Recommend Provisum add a real `support_tickets` table (separate from `incidents`) before integration, OR explicitly scope this integration to `incidents` only and treat user tickets as out of band.
6. **Audit trail of incident lifecycle.** PATCH (status changes, resolution) does **not** write to `audit_log`. If the management suite needs an immutable history of who changed what when, Provisum would need to add that.
7. **Comments / activity log.** No table exists today (§3). Decide whether the MS owns this concept entirely or whether Provisum should grow an `incident_comments` table.
8. **Schema modernization vs. Cursus alignment.** `incidents` uses `serial` PK and `text` timestamps. `CLAUDE.md` "Schema rules for Cursus compatibility" calls for UUID PKs and `timestamptz`. If/when this table is rebuilt for Cursus alignment, the integration contract will break — versioning the integration endpoint (`/api/integration/v1/incidents`) from day one is wise.
9. **`generateTicketNumber` collision risk.** `PRV-YYMM-NNNN` with `Math.random` ([app/api/support/route.ts:22-28](app/api/support/route.ts:22)) — only ~9000 unique numbers per month. Not a §1 problem unless the management suite is asked to key off `ticketNumber`. Flag if relevant.
