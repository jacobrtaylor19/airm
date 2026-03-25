# AIRM — AI Role Mapping Tool

AIRM is a workflow tool for managing enterprise role migrations (e.g. SAP ECC → S/4HANA). It uses AI to group users into security personas, maps those personas to target roles, runs SOD conflict analysis, and routes the results through a structured mapper → approver workflow.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, Server Components) |
| Database | SQLite via `better-sqlite3` + Drizzle ORM |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Auth | Cookie-based sessions, `bcryptjs` password hashing |
| Tables | TanStack React Table |
| Exports | `exceljs`, `pdfkit`, `csv-parse` |

---

## Quick Start

```bash
pnpm install

# Push schema and seed with demo data
pnpm db:push
pnpm db:seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). On first run you'll be redirected to `/setup` to create the initial admin account. The seed script creates a default `admin` / `admin123` account if you skip setup.

### Demo data packs

```bash
pnpm db:seed -- --demo=sap-migration
```

Data files are read from `data/` (or `data/demos/<packname>/` for demo packs) as CSV files.

---

## User Roles

| Role | Hierarchy | Description |
|------|-----------|-------------|
| `system_admin` | 100 | Full access including system config console |
| `admin` | 80 | Full project access, user management |
| `approver` | 60 | Approves role assignments within their org unit scope |
| `coordinator` | 50 | View access + can send notifications to mappers/approvers |
| `mapper` | 40 | Maps personas to target roles within their org unit scope |
| `viewer` | 20 | Read-only access |

Mapper, approver, and coordinator roles are scoped to an org unit (`appUsers.assignedOrgUnitId`). All descendant org units in the hierarchy are included automatically.

---

## Workflow Stages

```
Upload → Personas → Mapping → SOD Analysis → Approval
```

1. **Upload** — Import users, source roles, target roles, and SOD rules via CSV/Excel
2. **Personas** — AI clusters users into security personas based on role patterns
3. **Role Mapping** — Mappers assign target roles to each persona; excess provisioning is flagged
4. **SOD Analysis** — Conflicts between assigned roles are detected against the SOD rulebook
5. **Approval** — Approvers review and approve/reject each user assignment

---

## Key Features

### Dashboard
- **Workflow stepper** showing progress across all 5 stages
- **Strapline** — opinionated, role-aware status summary (e.g. *"12 assignments are sitting in the approval queue — this is the critical path right now"*)
- **Provisioning Alerts** — scoped to the user's org unit, with inline accept/revoke for exceptions
- **Department kanban** — per-department breakdown across all workflow stages

### Authentication & Role Scoping
- Cookie-based sessions (`airm_session`, 24h expiry, httpOnly)
- First-run `/setup` creates the initial admin
- `/login` with username + password
- Mapper/approver/coordinator only see users in their assigned org unit subtree

### Notifications (demo mode)
- Coordinators and admins can send in-app notifications to mappers/approvers
- Inbox with unread badge and mark-read
- 4 quick-message templates: mapping pending, approval pending, SOD review, over-provisioning
- No email transport — all notifications are stored in the `notifications` table

### Provisioning Alerts
- Surfaces personas mapped to roles where `excessPercent` exceeds the configured threshold
- Threshold is configurable per-project via admin console (`least_access_threshold` setting)
- Exceptions accepted with justification, recorded in `leastAccessExceptions`
- Scoped to user's org unit on the dashboard; full analysis at `/least-access`

### SOD Analysis
- Ruleset uploaded via CSV into `sodRules`
- Conflicts detected at user level and surfaced by severity (critical / high / medium / low)
- Conflicts block approvals until resolved or accepted

### Releases
- Scoped migration waves; users assigned per release
- Existing production access from prior waves is imported and included in SOD analysis

---

## Database Schema (tables)

### Identity & Auth
- `orgUnits` — 3-level org hierarchy (L1 → L2 → L3)
- `appUsers` — tool users (admin, mapper, approver, coordinator, viewer)
- `appUserSessions` — active session tokens
- `workAssignments` — legacy mapper/approver → department scope

### Source System (ECC)
- `users` — source users with department, job title, org unit
- `sourceRoles` — legacy roles (SAP ECC)
- `sourcePermissions` — T-codes / permission objects
- `sourceRolePermissions` — role ↔ permission junction
- `userSourceRoleAssignments` — user ↔ source role

### Target System (S/4HANA)
- `targetRoles` — Tier 3 security roles
- `targetPermissions` — target permission objects
- `targetTaskRoles` — Tier 2 task role bundles
- `targetTaskRolePermissions`, `targetSecurityRoleTasks`, `targetRolePermissions` — role hierarchy junctions

### AI Mapping
- `consolidatedGroups` — high-level access groups
- `personas` — security personas (AI-generated or manual)
- `personaSourcePermissions` — characteristic permissions with weights
- `userPersonaAssignments` — AI-assigned user → persona (with confidence score)
- `personaTargetRoleMappings` — persona → target role (with `coveragePercent`, `excessPercent`)
- `userTargetRoleAssignments` — final user → target role with approval status

### Risk & Compliance
- `sodRules` — SOD rulebook
- `sodConflicts` — detected violations per user
- `leastAccessExceptions` — accepted over-provisioning exceptions
- `permissionGaps` — uncovered permissions per persona

### Operations
- `releases` — migration waves
- `releaseUsers`, `releaseOrgUnits` — release scope
- `notifications` — in-app inbox
- `processingJobs` — async job queue
- `auditLog` — change history
- `systemSettings` — key-value project config

---

## Settings (admin-configurable)

Settings are stored in `systemSettings` and accessed via `lib/settings.ts`.

| Key | Description | Default |
|-----|-------------|---------|
| `project_name` | Display name in header/sidebar | `AIRM` |
| `least_access_threshold` | Over-provisioning alert threshold (%) | `30` |
| `confidence_threshold` | Minimum AI confidence for auto-assignment | `65` |
| `sod_auto_reject_threshold` | SOD severity that auto-rejects assignments | — |

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Authenticate, set session cookie |
| POST | `/api/auth/logout` | Clear session |
| POST | `/api/auth/setup` | Create initial admin (first-run only) |
| GET/POST/DELETE | `/api/admin/app-users` | CRUD app users |
| GET/POST/DELETE | `/api/admin/assignments` | Work assignments |
| POST/PATCH | `/api/notifications` | Send / mark-read notifications |
| POST/DELETE | `/api/least-access/exceptions` | Accept / revoke exceptions |
| POST | `/api/approvals/[id]` | Approve / reject assignment |
| POST | `/api/mapping/[personaId]` | Save persona → target role mapping |
| GET | `/api/exports/provisioning` | CSV provisioning export |
| POST | `/api/jobs/[jobType]` | Trigger async processing jobs |

---

## Project Structure

```
airm/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Main dashboard (strapline, KPIs, dept kanban, provisioning alerts)
│   ├── mapping/            # Role mapping workspace
│   ├── approvals/          # Approval queue
│   ├── sod/                # SOD conflict analysis
│   ├── least-access/       # Full provisioning analysis (detail view)
│   ├── notifications/      # In-app notification inbox
│   ├── personas/           # Persona management
│   ├── releases/           # Release/wave management
│   ├── admin/              # User management + system config console
│   ├── login/              # Auth pages
│   ├── setup/              # First-run admin creation
│   └── api/                # API route handlers
├── components/
│   ├── layout/             # Sidebar, header, workflow stepper
│   ├── dashboard/          # KPI card
│   └── ui/                 # shadcn/ui components
├── db/
│   ├── schema.ts           # Drizzle schema (single source of truth)
│   ├── index.ts            # DB connection (WAL mode, FK enabled)
│   └── seed.ts             # CSV-based seeder
├── lib/
│   ├── auth.ts             # Session management, role hierarchy
│   ├── scope.ts            # Org-unit-based user scoping
│   ├── queries.ts          # Shared DB queries
│   ├── settings.ts         # getSetting / setSetting helpers
│   ├── strapline.ts        # Rule-based dashboard status generator
│   └── ai/                 # Claude API integration helpers
├── middleware.ts            # Session cookie validation, login redirect
└── data/                   # CSV seed files
```
