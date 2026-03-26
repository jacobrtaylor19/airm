# Provisum Changelog

All notable feature additions and changes are documented here. Most recent first.

---

## [0.6.0] — 2026-03-25 — Security Compliance Hardening

### Security
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
