# Provisum Changelog

All notable feature additions and changes are documented here. Most recent first.

---

## [1.1.0] — 2026-04-01 — Source System Typing + Knowledge Base + SOX Evidence

### Source and Target System Typing
- **System context module** (`lib/ai/system-context.ts`): 10 source system types (SAP ECC, S/4HANA, BW, Oracle EBS, Oracle Cloud, Workday, Dynamics 365/AX, ServiceNow, Other) and 7 target system types with structured prompt context (permission units, role units, naming conventions)
- **Release-level system config**: `defaultSourceSystemType` + `targetSystemType` columns on releases, `sourceSystemTypeOverride` on release org units
- **Release UI**: Source/target system dropdowns replace freetext field; system type badges on release cards
- **AI pipeline injection**: `buildSystemContextPrompt()` injected into persona generation and target role mapping prompts from the active release's system types

### Permission Changes Drill-Down
- **Bidirectional tracking**: Adoption Risk card renamed "Permission Changes" — now shows users gaining AND losing access
- **Drill-down modal**: Click the card to see per-user detail with persona, source/target permission counts, gained/lost counts, net change direction
- **Filter tabs**: All / Gaining / Reduced filters in the drill-down modal
- **New query fields**: `usersWithReducedAccess`, `totalLostPerms`, `adoptionUserList` in `AggregateRiskAnalysis`

### In-App Knowledge Base (v1.2.0)
- **Help center**: `/help` index page with client-side search and category filtering (7 categories)
- **Article pages**: `/help/[slug]` with markdown-to-HTML renderer, related articles, Lumen integration prompt
- **10 role-aware articles**: What is Provisum, 5-Stage Workflow, Uploading Data, Security Personas, Mapping Roles, SOD Resolution, Compliance Workspace, AI Confidence Scores, Release Management, User Management
- **Role filtering**: Articles scoped by role (e.g., admin-only articles hidden from viewers)
- **Sidebar link**: "Knowledge Base" added under LEARN section

### SOX/ITGC Audit Evidence Package
- **Evidence generator** (`lib/exports/evidence-package.ts`): 5-section Excel workbook — Cover Sheet, Control Summary (SOX 404 or SOC 2 CC6), User Access Matrix, Persona Assignment Audit Trail, SOD Conflict Register, Approval Audit Trail
- **Two frameworks**: SOX 404 (7 ITGC controls) and SOC 2 CC6 (4 controls) with framework-specific control mappings
- **Generation history**: `evidence_package_runs` table tracking all generations with population stats
- **Admin UI**: `/admin/evidence-package` with framework/scope selectors and generation history table
- **API**: `GET/POST /api/admin/evidence-package` — list runs / generate & download

### Infrastructure
- **New table**: `evidence_package_runs` (53 tables total)
- **Schema columns**: `default_source_system_type`, `target_system_type` on releases; `source_system_type_override` on release_org_units

---

## [0.7.0] — 2026-03-28 — Supabase Auth + Risk Quantification + Due Dates

### Supabase Auth Migration
- **Replaced custom cookie auth with Supabase Auth**: JWT-based sessions via `@supabase/ssr`
- **Bridge pattern**: `appUsers.supabaseAuthId` links app users to Supabase `auth.users`
- **Middleware rewrite**: Session refresh on every request via Supabase server client
- **17 demo auth users**: Created via Supabase Admin API in seed script
- **Password changes**: Now use `supabase.auth.updateUser()` instead of bcrypt
- **Removed bcrypt dependency**: All password operations delegated to Supabase

### Risk Quantification Dashboard
- **3 risk categories**: Business Continuity (coverage gaps), Adoption Risk (new permissions), Incorrect Access (gaps + SOD conflicts)
- **Dashboard summary cards**: Color-coded risk indicators on main dashboard with link to full analysis
- **Dedicated `/risk-analysis` page**: Detailed metrics, analysis summary, flagged users table
- **Bulk analysis**: 6 optimized queries instead of N+1 per-user pattern
- **Scope-aware**: Non-admin users see risk for their org unit only

### Coordinator Due Dates
- **Release-level phase deadlines**: `mapping_deadline`, `review_deadline`, `approval_deadline` on releases table
- **Visual overdue indicators**: Past-due deadlines shown in red on release cards
- **Create/Edit dialog**: Phase deadline date pickers in release management UI

### Render Redirect
- **Branded redirect page**: `public/render-redirect.html` with auto-redirect to Vercel URL, countdown timer, animated progress bar

### Row-Level Security
- **RLS enabled on all 39 tables**: Defense-in-depth — blocks direct Supabase REST API access
- **`postgres` role bypasses RLS**: App's pooled connection continues working normally
- **`anon`/`authenticated` roles blocked**: No data accessible via Supabase auto-generated API

### Infrastructure
- **Supabase env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set on Vercel
- **Dashboard number fix**: Wrapped all `sql<number>` results with `Number()` to prevent string concatenation
- **Set iteration fix**: `Array.from()` for ES target compatibility in risk analysis queries

---

## [Unreleased] — 2026-03-26

### Pipeline Validation (Due Diligence)
- **Validation dashboard** (`/admin/validation`): Interactive, system-admin-only tool for proving the platform works as described. Three tabs: Overview (pipeline flow, distribution charts, confidence histogram, edge case panel), Users (searchable/filterable table with click-to-inspect detail modals showing full attribution chain), Personas (per-persona cards with mapped target roles)
- **Attribution chain tracing**: Click any user to see source attributes → persona assignment (with AI reasoning + confidence score) → target role derivation → SOD conflict status in a single modal
- **Edge case detection**: Flags users with no persona, low confidence, missing target roles, high SOD conflicts, or unusually complex source role sets
- **Excel validation export**: One-click download of 5-tab XLSX — Validation Summary, Full Attribution Chain (17 columns with validation flags), Persona Distribution, SOD Conflicts, Methodology
- **Sidebar link**: Added "Pipeline Validation" under SYSTEM section (FlaskConical icon)

### Other Improvements
- **Persona cascade override flag**: Detect and display preserved overrides
- **User-level permission gap analysis**: Added to user detail page

---

## [0.6.0] — 2026-03-26 — Security Compliance Hardening + Demo Overhaul

### Demo Data & Self-Guided Environment (2026-03-26)
- **Demo data refresh**: Default pack scaled to 1,000 users (optimized for API costs)
- **Clean demo state**: Removed pre-generated personas, target role assignments, and SOD conflicts from seed — full workflow demonstrated live
- **9 demo environments**: SAP S/4HANA (default, energy-chemicals, consumer-products, financial-services, manufacturing), Oracle Fusion, Workday, Salesforce, ServiceNow
- **Self-guided demo accounts**: `demo.admin`, `demo.mapper.finance`, `demo.approver`, `demo.viewer`, `demo.coordinator` — password `DemoGuide2026!`
- **Quick-login pill buttons**: Demo credentials displayed as teal pills on login page

### AI Pipeline Fixes (2026-03-26)
- **Persona generation**: 2-phase approach — AI analyzes 100-user sample to design personas, then programmatic permission-overlap assignment for all users. Prevents JSON truncation on large datasets
- **Fire-and-forget jobs**: Persona generation and auto-map run in background; client polls for completion instead of blocking
- **Auto-map protection**: No longer overwrites manual/approved mappings
- **Error visibility**: Failed AI jobs now log actual error messages (not sanitized "Unknown error")

### UI/UX Improvements (2026-03-26)
- **Personas page**: Removed department confirmation section; added business function filter dropdown
- **Jobs page**: Viewer role sees status badges (Done/Running/Pending) instead of run buttons
- **Landing page**: Simplified to hero + feature cards + footer; nav bar on all public pages
- **Releases**: Button text changed from "Set as Current" to "View"
- **Dashboard strapline**: Shows "Generate Personas" instruction when none exist
- **Login page**: Demo credentials shown as teal pill buttons; Sign In button matched to brand teal

### QA Fixes (2026-03-26)
- **Per-account lockout**: Rate limiter now tracks per username (not global IP-based)
- **Password validation**: Server-side enforcement on user creation and password change
- **User table rows**: Clickable with navigation to user detail page
- **Version display**: Footer shows v0.6.0 (was hardcoded to v0.4.0)
- **404 page**: Branded with Provisum styling and "Go to Dashboard" button
- **Error clearing**: Login error clears on input change

### Security (2026-03-25)
- **Encryption at rest**: AES-256-GCM encryption for sensitive settings (API keys, tokens) via `lib/encryption.ts`
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy on all responses
- **Password policy**: 12-character minimum with uppercase, lowercase, digit, and special character requirements
- **Account lockout**: 5 failed login attempts triggers 30-minute lockout with audit trail
- **Rate limiting**: Login (5/15min per IP), AI endpoints (10/min per user), bulk operations (5/min per user)
- **Input validation**: Zod schemas on all critical API request bodies
- **Error sanitization**: Production responses return generic messages with correlation IDs, no stack traces
- **Bcrypt rounds**: Increased from 10 to 12

### Infrastructure
- **Audit log separation**: Immutable audit entries in separate SQLite database (`audit.db`)
- **Audit export**: Admin endpoint for CSV/JSON audit log exports with filtering
- **Health endpoint**: `/api/health` with database connectivity check (no auth required)
- **Backup scripts**: Encrypted daily backups with 30-day retention and monthly verification
- **CI/CD pipeline**: GitHub Actions with build, lint, and `pnpm audit` security scanning
- **Dependabot**: Weekly automated dependency updates

### GDPR Compliance
- **Data export endpoint**: Article 15 — DSAR export of all user-associated data
- **Data deletion endpoint**: Article 17 — PII anonymization while preserving audit integrity
- **Data Processing Inventory**: Article 30 — documented data categories, retention, processors

### Documentation
- **Incident Response Plan**: Severity classification, escalation paths, communication templates
- **Change Management**: Change categories, approval process, rollback procedures
- **Vendor Security**: Anthropic and Render assessments with evaluation template
- **Security Controls**: Full SOC 2 trust service criteria mapping

### Added
- `lib/encryption.ts` — AES-256-GCM encrypt/decrypt with key validation
- `lib/password-policy.ts` — configurable password strength validation
- `lib/rate-limit.ts` + `lib/rate-limit-middleware.ts` — in-memory rate limiter
- `lib/validation/` — Zod schemas for auth, admin, mapping operations
- `lib/errors.ts` — safeError() for production error sanitization
- `lib/audit.ts` — centralized audit logging interface
- `lib/monitoring.ts` — Sentry-ready error reporting module
- `db/audit-db.ts` — separate immutable audit database
- `app/api/health/route.ts` — health check endpoint
- `app/api/auth/change-password/route.ts` — password change with policy validation
- `app/api/admin/audit-export/route.ts` — audit log export (JSON/CSV)
- `app/api/admin/data-export/route.ts` — GDPR Article 15 data export
- `app/api/admin/data-deletion/route.ts` — GDPR Article 17 data erasure
- `scripts/backup.sh`, `scripts/restore.sh`, `scripts/verify-backup.sh`
- `.github/workflows/ci.yml`, `.github/dependabot.yml`
- `docs/security/` — INCIDENT_RESPONSE_PLAN, CHANGE_MANAGEMENT, VENDOR_SECURITY
- `docs/SECURITY_CONTROLS.md`, `docs/DATA_PROCESSING_INVENTORY.md`

### Changed
- `db/schema.ts` — added `failedLoginAttempts`, `lockedUntil` to appUsers; `ipAddress`, `metadata` to auditLog
- `lib/auth.ts` — bcrypt rounds 10→12
- `lib/settings.ts` — transparent encryption/decryption of sensitive values
- `middleware.ts` — security headers on all responses, `/api/health` in public paths
- All 30 API routes — error responses use `safeError()` instead of raw `err.message`
- All 7 export routes — auth guards and audit logging added

---

## [Unreleased] — Previous Session

### Dashboard — Provisioning Alerts (consolidated)
- Removed "Least Access" from the sidebar nav — over-provisioning analysis now lives directly on the dashboard
- Added **Provisioning Alerts** card to `DashboardFiltered` with scoped alert list (filtered to user's org unit)
- Inline accept/revoke exception workflow — no separate page needed for the common case
- Pending alert count summarised in "Attention Required" card
- Full detail view still accessible at `/least-access` (direct URL, not in nav)
- Renamed all user-facing references from "Least Access" to "Provisioning Alerts"

### Dashboard — Strapline (opinionated rewrite)
- Rewrote `lib/strapline.ts` to use direct, action-oriented language
- Names the bottleneck explicitly rather than describing metrics (e.g. *"Mapping is lagging — 12 personas still need target role assignments. Approvals can't begin until mappers close these out."*)
- Uses prescriptive verbs: *"Get approvers moving"*, *"Push for the finish line"*, *"That's your focus — the release depends on it"*
- Helper `n()` utility handles pluralisation throughout
- Area straplines (mapper/approver/coordinator) updated with matching tone

### Sidebar — nav cleanup
- Removed "Least Access" nav link (analysis moved to dashboard)
- Removed "Legacy Access Browser" (Data Explorer) from DATA section
- Sidebar now contains only actively-used routes

### Deployment — Render.com
- Added `render.yaml` blueprint: Node web service, Oregon region, Starter plan
- Persistent disk at `/data` (1 GB) for SQLite across deploys and restarts
- `DATABASE_PATH=/data/airm.db` env var wired through `db/index.ts` and `drizzle.config.ts`
- `ANTHROPIC_API_KEY` declared with `sync: false` (set manually in Render dashboard)
- New `scripts/start.sh`: pushes schema on every start, seeds only on first run (checks `app_users` count to detect blank DB)

### Documentation
- Replaced default Next.js README with full project documentation (`README.md`)
- Created `CLAUDE.md` with developer and AI-assistant context, gotchas, and file map
- Created `docs/PRESENTATION_CONTENT.md` with structured slide content for 5 decks
- Created `CHANGELOG.md` (this file) and `docs/ROADMAP.md`

---

## [0.3.0] — Auth + Role Scoping + Notifications + Provisioning Alerts

### Mapping Coordinator role
- New `coordinator` role added to `ROLE_HIERARCHY` (level 50, between approver and mapper)
- Coordinator scoped to org unit like mapper/approver; no legacy work assignment fallback
- View-only access to status, personas, mappings, approvals
- Appears in admin user management with distinct colour badge

### In-app Notifications (demo mode)
- New `notifications` table in schema (fromUserId, toUserId, type, subject, message, status)
- `/notifications` page with Compose (coordinators/admins), Inbox (all), Sent (coordinators/admins) tabs
- Compose supports recipient checkboxes with "All Mappers" / "All Approvers" bulk select
- 4 quick-message templates: Mapping Pending, Approval Pending, SOD Review, Over-Provisioning Review
- Notification type: Reminder / Escalation / Info
- Inbox unread badge, mark-read button, relative timestamps via `date-fns`
- API: `POST /api/notifications` (send), `PATCH /api/notifications` (mark read)
- No email transport — demo mode only; all notifications stored in DB

### Provisioning Alerts (Least Access)
- New `/least-access` page with full analysis view
- `getLeastAccessAnalysis(threshold)` query returning over-provisioned persona→role mappings with exception status
- Exception workflow: accept with justification, revoke
- API: `POST /api/least-access/exceptions`, `DELETE /api/least-access/exceptions`
- New `leastAccessExceptions` table tracking accepted exceptions
- Over-provisioning badges on mapping page role chips (orange when excess ≥ threshold)
- `least_access_threshold` setting added to admin console (default: 30%)

### Dashboard Strapline (initial version)
- New `lib/strapline.ts` generating qualitative project status
- Role-aware: admin gets project summary, mapper/approver/coordinator get area summary
- Tone-driven banner: positive (emerald), action (orange), warning (yellow), neutral (blue)
- Computed from existing dashboard stats — no extra DB queries

---

## [0.2.0] — Authentication & Role-Based Access

### Cookie-based authentication
- New `appUsers`, `appUserSessions` tables
- `lib/auth.ts`: session creation/validation, `requireAuth()`, `requireRole()`, password hashing
- `middleware.ts`: validates `airm_session` cookie on every request, redirects to `/login`
- `/login` page with username + password form
- `/setup` page for first-run admin account creation
- `/unauthorized` page for blocked access attempts
- API: `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/setup`

### Role-based data scoping
- `lib/scope.ts`: org-unit-based scoping for mapper/approver/coordinator
- `getUserScope(user)` returns scoped user ID list (`null` = unrestricted)
- `getUserScopeDepartments(user)` returns scoped department list
- Descendant org units automatically included via `getDescendantOrgUnitIds()`
- Mapping page filters personas to mapper's scope
- Approvals page filters assignments to approver's scope

### Admin UI
- `/admin/users` — CRUD for app users (create, edit role, toggle active, reset org unit)
- `/admin/assignments` — legacy work assignment management
- ADMIN nav section (admin/system_admin only) in sidebar

### Org hierarchy
- `orgUnits` table (L1/L2/L3 hierarchy)
- Users assigned to org units via `assignedOrgUnitId`
- App users assigned to org units via `appUsers.assignedOrgUnitId`

---

## [0.1.0] — Core Workflow

### Data model
- Complete schema: users, sourceRoles, sourcePermissions, targetRoles, targetPermissions, personas, consolidatedGroups, sodRules, sodConflicts, userPersonaAssignments, personaTargetRoleMappings, userTargetRoleAssignments, releases, auditLog, systemSettings, processingJobs

### AI persona generation
- Claude API integration for user → persona clustering
- Confidence scoring, AI reasoning storage
- Low-confidence flagging

### Role mapping
- Persona → target role mapping UI
- Coverage % and excess % computation
- Permission gap tracking

### SOD analysis
- SOD rulebook upload and conflict detection
- Severity-based conflict categorisation
- Conflict resolution workflow

### Approvals
- Approval queue with status progression (ready_for_approval → approved / rejected)
- `approvedBy` / `rejectedBy` audit fields

### Releases
- Release/wave management with user and org unit scoping
- Existing access carryover for SOD analysis

### Dashboard
- Workflow stepper with stage completion status
- KPI cards (users, personas, coverage, mapping, approval)
- Department kanban grid
- Source system breakdown
- Attention Required card (SOD conflicts, low confidence)

### Exports
- CSV provisioning export
- Excel and PDF support

### Other
- Project settings (admin console) — key-value config
- Audit log
- Job queue for async processing
- Releases management
