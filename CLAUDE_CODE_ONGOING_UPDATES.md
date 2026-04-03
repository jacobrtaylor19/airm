# Provisum — Ongoing Updates (Session State)

**Last updated:** 2026-04-02 | **Version:** v1.3.0 | **Build:** clean (zero errors, zero warnings) | **Tests:** 92 unit + 46 E2E (Playwright) | **Tech Debt:** 20/20 resolved (A)

---

## Owner Actions

| # | Action | Blocks | Status |
|---|--------|--------|--------|
| 1 | ~~Create Sentry project → get DSN~~ | Error tracking | ✅ DONE (2026-03-30) |
| 2 | ~~Set `NEXT_PUBLIC_SENTRY_DSN`~~ | Error tracking | ✅ DONE (2026-03-30) |
| 3 | ~~Set `SENTRY_AUTH_TOKEN`~~ | Source map uploads | ✅ DONE (2026-03-30) |
| 4 | ~~Set `RESEND_API_KEY`~~ | User invite emails | ✅ DONE (2026-03-30) |
| 5 | ~~Set `NEXT_PUBLIC_APP_URL`~~ | Invite link URLs | ✅ DONE (2026-03-30) |
| 6 | ~~Set `CRON_SECRET`~~ | Scheduled export cron | ✅ DONE (2026-03-30) |
| 7 | Set `SENTRY_ORG` + `SENTRY_PROJECT` on Vercel | Sentry source map uploads | ⬜ TODO |

---

## Recent Changes (This Session)

### v1.3.0 Clickthrough Fix Sprint + Demo UX (2026-04-02)

**35-item clickthrough fix sprint** based on admin walkthrough findings document. All items resolved.

**Block 0 — Critical Data Bugs:**
- SOD scoped delete: `lib/sod/sod-analysis.ts` now deletes only analyzed users' conflicts (was wiping ALL)
- SOD toast polling: `app/sod/sod-client.tsx` polls job status instead of reading undefined fields

**Block 1 — Demo-Breaking UX (11 items):**
- Auto-map page refresh on job completion (`app/mapping/auto-map-progress.tsx`)
- Optimistic submit-for-review: users move out of Draft instantly (`app/mapping/user-refinements.tsx`)
- "Send Back to Draft" button for pending_review users
- Select All checkbox for bulk submit
- SOD page optimistic updates on resolve/accept/escalate actions
- Remap vs first-time badge (amber "Remapped" vs subtle "New")
- PDF export error handling (was returning JSON on failure)
- Provisioning CSV branded header + employee_id/department/email columns
- SOD exception report with mitigating controls columns + branded header

**Block 2 — Navigation & Module UX (8 items):**
- Quick Nav in ALL module sidebars (was Dashboard only)
- Responsive headers with truncation on small screens
- Back button in header (ArrowLeft → `router.back()`)
- Shared page module context: `moduleOwnsPath()` checks nav hrefs + sidebar links set `airm_active_module` cookie
- Approvals page visible to admin (read-only)
- Excel permission gaps placeholder row when empty
- Validation page org-scoped (14 queries fixed)

**Block 3 — Admin & Data Gaps (5 items):**
- Remove direct password creation from admin — invite-only flow
- Admin user actions: deactivate/reactivate, change role, send invite (dropdown per row)
- Existing Production Access page (`app/data/existing-access/`)
- Compliance workspace seeded with 8 SOD conflicts (5 escalated)
- Assignments page: inline edit capability with PUT endpoints

**Block 4 — Content (3 items):**
- Bulk assign UI redesign with clearer layout
- Permission changes drill-down: click rows to navigate to user detail
- Admin onboarding guide (8 phases) + quick-start articles for mapper/approver

**SOD Existing Access Labeling:**
- `involved_existing_access` boolean on `sod_conflicts` table
- SOD analysis tracks which roles come from existing production access
- Blue "Existing Access" badge on SOD page for flagged conflicts
- Info callout on existing access page linking to SOD analysis

**Demo Environment Overhaul:**
- Glassmorphism login page (dark bg, frosted glass card, teal accents) inspired by Cursus
- Demo overview page at `/` with lead capture gate, 8 persona cards, feature grid, data stats
- Lead capture: `demo_leads` table, `POST /api/demo/register`, Resend email notification, 30-day cookie
- Hostname-based demo/prod separation (`lib/demo-mode.ts`):
  - `demo.provisum.io` → demo mode (persona pills, env switcher, lead gate, restricted uploads)
  - `app.provisum.io` → production mode (clean login, full upload functionality, no demo features)
- All 8 persona types on login pills (added Security Architect + Compliance Officer)
- Upload page: shows full UI in demo but disables upload buttons + template downloads
- Upload/template APIs return 403 in demo mode (server-side enforcement)

**Sales Site Polish (provisum-site):**
- Darkened teal accent for WCAG contrast (#0d9488 → #0a7a70)
- Updated CTAs: "Request early access" → "Request a demo"
- Tightened hero padding

**DB Credential Fixes:**
- demo.pm: email corrected to @provisum.io, password reset
- demo.security + demo.compliance: passwords reset to DemoGuide2026!

**Unit Tests:** 92 total (51 new) covering SOD scoped delete, provisioning export, SOD exception report, app-users PATCH, help articles, auth roles

**Schema Changes (applied via Supabase MCP SQL):**
- ALTER TABLE `sod_conflicts`: +`involved_existing_access` boolean
- CREATE TABLE `demo_leads` (id, name, email, company, role, created_at, source)
- **Total: 56 tables** in Supabase Postgres

**New Files:**
- `lib/demo-mode.ts` — Hostname-based demo detection (server + client)
- `app/demo-gate.tsx` — Lead capture gate component (glassmorphism form)
- `app/api/demo/register/route.ts` — Public lead capture endpoint
- `app/data/existing-access/page.tsx` + `existing-access-client.tsx` — Existing production access page
- `__tests__/lib/sod-analysis.test.ts` — 8 tests for SOD scoped delete
- `__tests__/lib/provisioning-export.test.ts` — 7 tests
- `__tests__/lib/sod-exception-report.test.ts` — 6 tests
- `__tests__/api/app-users-patch.test.ts` — 12 tests
- `__tests__/lib/help-articles.test.ts` — 20 tests

### v1.2.0 Market-Ready Sprint (2026-04-02)

Commit `624dd8f` — full autonomous sprint. All features shipped in a single session.

**Block A — Target Role Editing + Approval Workflow:**
- `target_roles` table: added `status` (draft/active/archived), `source` (uploaded/ai_generated/manual), `approved_by`, `approved_at`, `updated_at`, `updated_by`
- API: `GET/PUT/DELETE /api/target-roles/[id]`, `POST /api/target-roles/[id]/approve`, `POST /api/target-roles/[id]/reject`
- UI: `RoleEditDialog` with approve/archive/restore actions; filter tabs (All/Active/Draft/Archived); pencil edit button; draft amber banner
- Mapping page filters out draft/archived roles from the role selector

**Block B — Mitigating Controls for Accepted SOD Risks:**
- `sod_conflicts` table: added `mitigating_control`, `control_owner`, `control_frequency`, `control_last_reviewed_at`
- Accept-risk API passes control fields; resolution dialog has collapsible control section
- Green "Controlled" badge on accepted risks in conflict list
- Risk analysis page shows controls coverage row (X of Y accepted risks have documented controls)

**Block C — SSO/SAML Configuration:**
- New `sso_configurations` table with RLS deny-all policies
- CRUD at `/api/admin/sso`, domain lookup at `/api/auth/sso` (public)
- Admin console SSO tab with add/enable/disable/delete
- Login form "Sign in with SSO" flow with domain-based provider lookup
- Note: actual IdP redirect requires Supabase Enterprise — MVP stores config and shows activation CTA

**Block D — Security Design Export (Excel):**
- `GET /api/exports/security-design` — 3-sheet Excel workbook (ExcelJS)
  - Sheet 1: Role Catalog (name, code, status, source, approved by, perm count, user count)
  - Sheet 2: Permission Matrix (roles × top 50 permissions, ✓ marks)
  - Sheet 3: SOD Summary (type, roles, rule, severity, status, mitigating control)
- Teal header styling + alternating cream rows
- "Export Role Design" button in Security Workspace
- Audit logged as `security_design_exported`

**Block E — Mapper Notifications on Role Changes:**
- PUT target-roles notifies mappers with active assignments via `createWorkflowNotification()`
- POST approve notifies mappers that a new role is available for mapping
- Fire-and-forget pattern — never breaks the main operation

**Schema Changes (applied via Supabase MCP SQL):**
- ALTER TABLE `target_roles`: +6 columns (status, source, approved_by, approved_at, updated_at, updated_by)
- ALTER TABLE `sod_conflicts`: +4 columns (mitigating_control, control_owner, control_frequency, control_last_reviewed_at)
- CREATE TABLE `sso_configurations` with RLS + deny-all policies
- RLS deny-all added to `evidence_package_runs` and `workstream_items` (were missing)
- **Total: 55 tables** in Supabase Postgres

**New Files:**
- `app/api/target-roles/[id]/route.ts` — Target role CRUD
- `app/api/target-roles/[id]/approve/route.ts` — Approve draft roles
- `app/api/target-roles/[id]/reject/route.ts` — Reject draft roles
- `app/target-roles/role-edit-dialog.tsx` — Role edit/approve/archive dialog
- `app/admin/sso-tab.tsx` — SSO admin tab
- `app/api/admin/sso/route.ts` — SSO config CRUD (GET/POST)
- `app/api/admin/sso/[id]/route.ts` — SSO config update/delete (PUT/DELETE)
- `app/api/auth/sso/route.ts` — Public SSO domain lookup
- `app/api/exports/security-design/route.ts` — Excel export endpoint

**Modified Files:**
- `db/schema.ts` — target_roles columns, sod_conflicts columns, sso_configurations table
- `lib/queries/roles.ts` — TargetRoleRow + getTargetRoles with status/source/approval fields
- `lib/queries/sod.ts` — SodConflictRow + getSodConflicts with mitigating control fields
- `lib/queries/risk.ts` — controlsCoverage in AggregateRiskAnalysis
- `app/target-roles/target-roles-client.tsx` — Status filter tabs, edit button, draft styling
- `app/target-roles/page.tsx` — Passes userRole to client
- `app/mapping/page.tsx` — Filters out non-active roles
- `app/sod/resolution-dialogs.tsx` — Mitigating control section
- `app/sod/sod-client.tsx` — Pass extra fields to approve/reject
- `app/sod/conflict-list.tsx` — "Controlled" badge
- `app/risk-analysis/risk-analysis-client.tsx` — Controls coverage row
- `app/api/sod/accept-risk/route.ts` — Accepts control fields
- `app/admin/admin-console-client.tsx` — SSO tab
- `app/login/login-form.tsx` — SSO login flow
- `app/workspace/security/security-client.tsx` — Export button

### v1.0.0 Release (2026-03-31)

**Migration Health Dashboard (`/admin/migration-health`):**
- 6 KPI cards: persona coverage, mapping coverage, SOD resolution rate, approval rate
- Pipeline visualization with connected stages (users → personas → mappings → SOD → approvals)
- Confidence distribution chart (10 buckets)
- Overall health score = weighted average of 4 KPI percentages
- Color-coded progress bars (emerald ≥80%, yellow ≥50%, red <50%)
- `lib/queries/migration-health.ts` — 10 parallel DB queries via `Promise.all()`

**Release Readiness Checklist:**
- Collapsible 8-check panel on each release card in `/releases`
- Automated checks: scope defined, assignments created, SOD resolved, all approved, no drafts pending, target date set, mapping deadline met, approval deadline met
- Pass/fail icons with severity coloring (green/yellow/red)

**Confidence Distribution Chart:**
- Server-rendered histogram on `/calibration` (no client JS)
- 10 buckets (0-9 through 90-100), average confidence score, total assignment count
- Uses PostgreSQL `FILTER` clauses for bucket counts

**SOD Conflict Heatmap:**
- Department × severity matrix on `/sod` page
- Color-coded intensity scaling relative to max cell count
- Sorted by total conflicts descending
- 4-level color legend

**Admin Activity Pulse:**
- Widget on `/admin` page showing last 24h/7d action counts
- Top action types breakdown with bar chart
- Latest 5 actions with relative timestamps
- Client component fetching from `/api/admin/activity-pulse`

**DB Migration:**
- `mapping_feedback` + `incidents` tables created via Supabase MCP SQL
- `organization_id` backfill verified, NOT NULL constraints applied

**Deployed:** Pushed to main → Vercel auto-deploy triggered (2026-03-31)

### Mega Sprint 2 (2026-03-30, v0.9.0)

**AI-Assisted Mapping v2:**
- `lib/ai/mapping-suggestions.ts` — AI reasoning engine using Claude to rank target role candidates
- Considers business function alignment, naming conventions, permission overlap, and historical patterns
- Composite confidence: AI (60%) + overlap (30%) + historical acceptance (10%)
- `GET /api/mapping/ai-suggestions?personaId=N` — returns ranked suggestions
- `POST /api/mapping/ai-suggestions/feedback` — records accept/reject for learning loop
- `mapping_feedback` table for feedback persistence
- "AI Suggest" button (sparkles icon) in mapping UI with modal showing ranked cards, confidence badges, reasoning

**Multi-tenant Phase 2+3 (query scoping + NOT NULL):**
- All 44 query functions across 11 modules now accept `orgId` parameter and filter with `orgScope()`
- 16+ page/API call sites updated to pass `orgId` from auth context
- `organization_id` made NOT NULL on all entity tables (appUsers, users, personas, sourceRoles, consolidatedGroups, targetRoles, sodRules, releases, auditLog, orgUnits)
- `orgScope()` simplified to `eq()` (no more NULL fallback)
- All insert sites updated with `organizationId` (16 files fixed)
- Migration SQL: `db/migrations/backfill-org-id.sql`

**Target System Adapter Framework:**
- `lib/adapters/target-system-adapter.ts` — TypeScript interface for `TargetSystemAdapter`
- `lib/adapters/mock-sap-adapter.ts` — Mock SAP S/4HANA with 9 roles + real transaction codes
- `lib/adapters/index.ts` — Adapter registry factory
- API routes: test-connection, pull security design, review changes (accept/dismiss)
- `securityDesignChanges` table extended with change tracking fields
- `/admin/security-design` page with connection test, pull, diff review, change history
- Sidebar nav: "Security Design" under SYSTEM section

**Lumen Phase 5 (13 tools total — 5 new write-action tools):**
- `create_role_mapping` — create persona→target role mappings via chat
- `resolve_sod_conflict` — resolve SOD conflicts with accept_risk/mitigated/reassign
- `accept_calibration_items` — bulk-accept low-confidence assignments (admin only)
- `submit_for_review` — submit draft assignments to pending_review
- `send_reminder` — send notification reminders to mappers/approvers by department

**Resend Email Admin Settings:**
- New "Email" tab in admin console with enabled toggle, from address, from name, reply-to
- `lib/email.ts` reads settings from DB, graceful degradation
- `POST /api/admin/test-email` — send test email
- `GET /api/admin/test-email` — check API key status
- 5 default email settings seeded

**Automated Support Phase 1 (Incident Detection + AI Triage):**
- `incidents` table (17 columns: title, description, severity, status, source, aiClassification, resolution, metadata, etc.)
- `lib/incidents/detection.ts` — `detectIncident()` with deduplication (same source+ref or same title within 5 min)
- `lib/incidents/triage.ts` — `triageIncident()` sends to Claude for classification (category, rootCause, suggestedFix, confidence, blastRadius)
- API routes: `GET/POST /api/admin/incidents`, `PATCH /api/admin/incidents/[id]` (resolve, re-triage)
- Admin UI at `/admin/incidents` — incident list, severity/status badges, AI triage card, resolution form, create form
- Wired into: job-runner (dead-letter), health check (degraded), webhooks (auto-disabled endpoint)
- Sidebar nav: "Incidents" with AlertTriangle icon (system_admin only)

**Playwright E2E Tests (46 tests, 9 spec files):**
- Core: auth (4), dashboard (3), mapping workflow (3), approvals (2), error states (5)
- Expanded: admin features (8), full workflow (8), notifications (3), role access matrix (10)
- `playwright.config.ts` — Chromium only, serial (`workers: 1`), 120s timeout, 1 retry, auto-starts dev server
- `e2e/global-setup.ts` — Pre-authenticates 6 users via API, saves cookies to `e2e/.auth/*.json`
- `e2e/helpers/auth.ts` — 3 login strategies: storage state (fastest), API fallback with retry, form-based (for UI tests). Supports direct navigation via `navigateTo` param to skip intermediate `/dashboard` load.
- Scripts: `pnpm test:e2e`, `pnpm test:e2e:ui`
- Vitest config updated to exclude `e2e/`
- **Key fixes (2026-03-30):**
  - Serial execution + storage state auth (6 API calls vs 46) to mitigate dev server exhaustion
  - React hydration workaround: `click()` before `fill()` + `toBeEnabled()` check before submit
  - Welcome tour overlay dismissal (blocks pointer events on sidebar)
  - Strict mode: scope sidebar selectors to `aside nav` with `{ exact: true }`, `.first()` for repeated text
  - Admin console tests use `sysadmin` user (`system_admin` role required, not `admin`)
  - Role-access-matrix slimmed from 26 → 10 tests (positive access covered by other specs)
  - Heavy pages (`/mapping`, `/sod`) use `waitUntil: "commit"` with extended timeouts
- **Last run (2026-03-30):** 46 passed, 0 failed, 0 flaky (7.2m, clean run). Previously flaky test (admin /admin redirect) now stable.

**Sales Site Polish (provisum.io):**
- WCAG contrast fixes across 7 components (gray subtext bumped to AA compliance)
- ROI formula text bumped to 14px minimum
- Aria labels added to icon buttons
- OG image via Next.js ImageResponse API (1200x630, dark theme)
- Twitter card metadata added

### Mega Sprint (2026-03-30)

**New Infrastructure:**
- **Feature flags** — `feature_flags` table, `lib/feature-flags.ts` with 60s in-memory cache, role/user/percentage targeting, CRUD API + admin UI tab
- **Webhook event system** — `webhook_endpoints` + `webhook_deliveries` tables, `lib/webhooks.ts` with HMAC-SHA256 signing, 11 event types, auto-disable after 10 failures, admin UI tab with delivery log
- **Scheduled exports** — `scheduled_exports` table, `lib/scheduled-exports.ts`, Vercel cron at `/api/cron/exports` (hourly), admin UI tab
- **Multi-tenant org isolation (Phase 1)** — `organizations` table, `organization_id` nullable column on 10 entity tables, `lib/org-context.ts` helpers (getOrgId, orgScope, withOrgFilter, getOrgIdForInsert), 3-phase migration plan
- **OpenAPI spec** — `docs/openapi.yaml` (68 routes, 90 operations), served at `/api/docs/openapi`

**Lumen AI Chatbot Phases 3-4:**
- **Phase 3 (RAG)** — `lib/assistant/rag-context.ts` with 10 curated domain knowledge chunks, keyword+page relevance scoring, max 4 chunks per query
- **Phase 4 (Chat History)** — `chat_conversations` table, `GET/POST/DELETE /api/assistant/conversations`, `GET/PATCH /api/assistant/conversations/[id]`, conversation sidebar in widget, auto-save after each response
- **New tools** — `get_job_status` and `get_calibration_summary` added (8 total)

**Calibration Queue:**
- `/calibration` page with threshold slider, confidence badges, bulk accept
- `GET/PATCH /api/calibration` — fetch low-confidence assignments, accept/reassign/remove

**Webhook Dispatching Wired Into Workflows:**
- `mapping.created` → bulk-assign route
- `mapping.approved` → approve route
- `mapping.rejected` → send-back route
- `sod.analysis_complete` → SOD analyze route
- `persona.generated` → persona generation route
- `user.invited` → user invite route
- `export.completed` → Excel export route

**Email Notifications:**
- `lib/email.ts` extended with `sendNotificationEmail()` and `sendBulkNotificationEmails()`
- `lib/notifications.ts` fires email alongside DB notification (fire-and-forget)

### Tech Debt Mega-Sprint (18 of 20 items resolved)

**Infrastructure:**
- **DB-backed rate limiter** — Replaced in-memory `Map` with `rate_limit_entries` Postgres table using atomic upsert. Works across Vercel isolates.
- **Staging environment** — `develop` branch configured for Vercel preview deploys; CI runs on both branches + PRs; `vercel.json` added
- **Structured logging** — `lib/monitoring.ts` rewritten with JSON output, log levels (debug/info/warn/error), `withCorrelationId()` scoped logger factory
- **Encryption key rotation** — `ENCRYPTION_KEY_PREVIOUS` env var for dual-key decryption, `rotateAllSettings()`, `POST /api/admin/rotate-keys` (system_admin only)
- **Sentry error tracking** installed + all API route `console.error` calls → `reportError()` from monitoring module

**Code Quality:**
- **Large components split** — 9 sub-components extracted: mapping (4: persona-selector, role-assignment-panel, auto-map-progress, user-refinements), admin (2: org-tree-section, settings-section), sod (3: summary-cards, conflict-list, resolution-dialogs)
- **Upload route type safety** — File-level `eslint-disable` removed; `CsvRow` type alias, `getErrorMessage()`/`isDuplicateError()` helpers, all catches use `unknown`
- **eslint-disable cleanup** — 10 → 6 justified disables
- **Console.error cleanup** — All API routes now use `reportError()` with structured context

**Architecture:**
- **Job retry + dead-letter** — `lib/job-runner.ts` wraps all AI pipeline tasks with configurable retry (default 3 attempts, exponential backoff). Dead-letters on exhaustion.
- **56 database indexes** across all 39 tables
- **Vitest** — 41 smoke tests across auth, settings, strapline, middleware

### Lumen Phase 2 (AI Chatbot Tool Calling)
- **6 tools**: `get_dashboard_stats`, `get_persona_details`, `get_sod_conflicts`, `get_mapping_status`, `trigger_auto_map`, `trigger_sod_analysis`
- **Org-unit scoped** — All data tools filter results through `getUserScope()`. Mappers/approvers only see their org unit's data. Admins see everything.
- **Multi-turn tool loop** — Claude can chain up to 3 tool calls per message. SSE events show "Checking data..." status while tools execute.
- **Role-gated actions** — `trigger_auto_map` and `trigger_sod_analysis` check role permissions server-side
- **UI indicators** — "Live data" badge on tool-backed responses, teal spinner during tool execution

### Bulk Mapping UI Enhancements
- **Persona search** — Text search input to filter persona list
- **Filter chips** — "All", "Unmapped" (no target roles), "Low Coverage" (<70%)
- **Coverage badges** — Color-coded coverage % on each persona row
- **Select All visible** — Checkbox toggles all filtered/visible personas for bulk assign

### Data Upload Template Enhancements
- **Dynamic picklist templates** — `GET /api/upload/templates?type={type}` generates CSV with headers + valid values comment row + example rows
- **DB-backed picklists** — Templates fetch org units, role names, user IDs from live database
- **Template download button** — Every upload card now has a "Download Template" link
- **Enhanced validation** — Added picklist warnings for source/target role types, SOD severity, user types

### User Invite Flow
- Single invite, bulk CSV, accept, resend — all built and deployed
- `lib/email.ts` — Resend client with graceful degradation
- ⚠️ Blocked on Owner Action #4 (RESEND_API_KEY)

### User Invite Flow
- `POST /api/admin/users/invite` — create Supabase auth user + app_users + send email
- `POST /api/admin/users/invite/accept` — set password via token (no auth required)
- `POST /api/admin/users/invite/resend` — refresh expired tokens
- `POST /api/admin/users/bulk-invite` — CSV upload (max 100 rows)
- `lib/email.ts` — Resend client with `sendInviteEmail()`, graceful degradation
- `user_invites` table created in Supabase with indexes
- Setup page shows "Set Your Password" form when `?token=` param present
- Admin UI: Invite User dialog, Bulk Upload button, Resend Invite per-row action

### Resend Email Integration
- `provisum.io` domain verified in Resend
- `RESEND_API_KEY` + `NOTIFICATION_EMAIL` set on `provisum-site` Vercel project
- Sales site lead notifications live → `jacobrtaylor@gmail.com` from `Provisum <leads@provisum.io>`

### Lumen AI Chatbot
- Already built from previous sprint — added `maxDuration = 60` and "New Chat" button

### Sales Site Fixes
- Demo embed: redesigned from broken tab mockup → simulated dashboard with stat cards + progress bars
- Workflow animation: viewport trigger 0.3 → 0.05, all 5 stages now render
- Favicon already configured

### QA Bug Fixes (earlier this session)
- Login redirect race condition (BUG-001): `window.location.href` instead of `router.push`
- Dashboard timeout: `maxDuration = 60` + query parallelization + error boundary
- demo.pm account created in seed + live DB

### Tech Debt Remediation (6 of 20 items resolved)
1. Queries split: monolithic 2,125-line file → 11 domain modules
2. N+1 elimination: AI pipeline bulk loader (3 queries instead of 2000+)
3. Shared AI types extracted to `lib/ai/types.ts`
4. Middleware hardened: default-secure with exact-match Set + prefix array
5. CI audit blocking: removed `continue-on-error`
6. Scoped queries push `inArray` filter to SQL

---

## Known Issues

- **Sentry source maps not uploading** — DSN + auth token set, but `SENTRY_ORG` and `SENTRY_PROJECT` env vars not yet set on Vercel (Owner Action #7). Error tracking works; source maps don't.
- **All other Owner Actions resolved** — RESEND_API_KEY, CRON_SECRET, SENTRY_DSN, SENTRY_AUTH_TOKEN, NEXT_PUBLIC_APP_URL all set (2026-03-30)
- **DB tables created** — `mapping_feedback` + `incidents` tables created via Supabase MCP SQL (2026-03-31). `organization_id` NOT NULL applied on all entity tables.
- **SSO activation** — SSO config is stored but actual IdP redirect requires Supabase Enterprise plan. MVP shows activation CTA.
- **RLS deny-all** — All 55 tables now have RLS deny-all policies. App uses service role key to bypass.

---

## Architecture Notes

### Middleware Auth Model (default-secure)
```
PUBLIC_EXACT = Set(["/", "/login", "/setup", "/methodology", "/overview", "/quick-reference"])
PUBLIC_PREFIXES = ["/api/auth/", "/api/health", "/api/cron/", "/review/", "/api/admin/users/invite/accept", "/api/demo/"]

Everything else → requires Supabase JWT session → redirects to /login if missing
```

### Query Module Structure
```
lib/queries/
├── index.ts          # barrel re-export (consumers import from @/lib/queries)
├── dashboard.ts      # getDashboardStats, getDepartmentMappingStatus, etc.
├── users.ts          # getUsers(filterUserIds?), getUserDetail, getAllSimpleUsers
├── personas.ts       # getPersonas, getPersonaDetail, getPersonaIdsForUsers
├── roles.ts          # getSourceRoles, getTargetRoles, role detail functions
├── sod.ts            # getSodConflicts, getSodConflictsDetailed
├── approvals.ts      # getApprovalQueue, getApprovalQueueScoped (DB-level filter)
├── mapping.ts        # getUserGapAnalysis, getUserRefinementDetails
├── risk.ts           # getLeastAccessAnalysis, getAggregateRiskAnalysis (parallelized)
├── common.ts         # getUsersScoped (DB-level filter), release scoping helpers
├── jobs.ts           # getJobs
├── audit.ts          # getAuditLog
└── migration-health.ts # getMigrationHealthData (10 parallel queries)
```

### Email / Invite Architecture
```
lib/email.ts                          # Resend client, sendInviteEmail()
app/api/admin/users/invite/route.ts   # Create user + send invite
app/api/admin/users/invite/accept/    # Set password (no auth)
app/api/admin/users/invite/resend/    # Refresh token + re-send
app/api/admin/users/bulk-invite/      # CSV upload
app/setup/invite-accept-form.tsx      # Password form (client component)
db/schema.ts → userInvites            # Token storage with 24h expiry
```

### New Tables (v0.8.0 → v1.0.0)
```
organizations              # Multi-tenant org isolation
feature_flags              # DB-backed feature flags
webhook_endpoints          # Webhook subscription config
webhook_deliveries         # Webhook delivery log
scheduled_exports          # Export schedule config
chat_conversations         # Lumen chat history
mapping_feedback           # AI mapping suggestion accept/reject learning loop (v1.0.0)
incidents                  # Automated support incident detection + AI triage (v1.0.0)
sso_configurations         # SSO/SAML provider config per org (v1.2.0)
evidence_package_runs      # SOX/ITGC evidence package generation history (v1.1.0)
workstream_items           # Workstream tracking (v1.1.0)
```
Total: 56 tables in Supabase Postgres.

### New Tables (v1.2.0 → v1.3.0)
```
sso_configurations         # SSO/SAML provider config (org-scoped, RLS deny-all) (v1.2.0)
demo_leads                 # Lead capture from demo overview page (v1.3.0)
```

### Schema Changes (v1.2.0 → v1.3.0)
```
target_roles               # +status, +source, +approved_by, +approved_at, +updated_at, +updated_by (v1.2.0)
sod_conflicts              # +mitigating_control, +control_owner, +control_frequency, +control_last_reviewed_at (v1.2.0)
sod_conflicts              # +involved_existing_access (v1.3.0)
```

### Demo/Prod Mode Architecture (v1.3.0)
```
lib/demo-mode.ts
├── isDemoMode()           # Server-side: checks headers().get("host")
└── isDemoModeClient()     # Client-side: checks window.location.hostname

Demo hosts: demo.provisum.io, localhost, *.vercel.app
Prod hosts: app.provisum.io (everything else)

Demo mode enables:  persona pills, env switcher, lead gate, upload restrictions
Prod mode enables:  clean login, full uploads, no demo overview page
```

### Org Isolation Architecture (Phase 3 complete — NOT NULL enforced)
```
lib/org-context.ts
├── getOrgId(user)           # user.organizationId (NOT NULL)
├── orgScope(column, orgId)  # SQL: column = orgId (no NULL fallback)
├── withOrgFilter(orgId)     # SQL: organization_id = orgId
└── getOrgIdForInsert(user)  # Always returns concrete number
```

### AI Pipeline Bulk Loading
```
lib/ai/types.ts              # UserAccessProfile interface
lib/ai/load-user-profiles.ts # 3 bulk queries: role assignments, role→perm junctions, permissions
                              # Assembles UserAccessProfile[] in-memory via Maps
                              # Used by both persona-generation.ts and persona-assignment.ts
```
