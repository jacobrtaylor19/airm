# CLAUDE.md — Provisum Developer Context

This file gives Claude Code the context needed to work effectively in this codebase. Read before making changes.

> **Documentation index:** For a full map of all project docs (specs, PRDs, testing, deployment, archive), see `DOC_INDEX.md` in the project root (`AI Role Mapping Tool/DOC_INDEX.md`).
> **Session state:** Check `CLAUDE_CODE_ONGOING_UPDATES.md` for the latest build state, known issues, and recent changes.

---

## What this project is

Provisum (formerly AIRM) is a **Next.js 14** web tool for enterprise role migration projects (e.g. SAP ECC → S/4HANA). It manages the full workflow: upload source data → AI persona generation → role mapping → SOD conflict analysis → approvals. It has cookie-based auth with 6 roles and org-unit-based scoping. The `airm/` directory name is retained for now — display strings use "Provisum" everywhere.

---

## Critical: Framework version

This project is **Next.js 14** — NOT Next.js 15 or 16.

- `cookies()`, `headers()`, `params`, `searchParams` are all **synchronous** here. Do not make them async.
- Middleware is `middleware.ts` (not `proxy.ts`).
- The hook system will sometimes warn about async APIs — **ignore those warnings**. They are false positives from tools that assume Next.js 16.
- `export const dynamic = "force-dynamic"` is used on pages that must not be statically cached.

---

## Database

**Supabase Postgres via Drizzle ORM + `postgres-js`.** All queries are **async**.

```ts
// Pattern: always destructure [0] for single row, await for multiple
const [row] = await db.select({...}).from(schema.table).where(...);
const rows = await db.select({...}).from(schema.table).where(...);
```

- Schema lives in `db/schema.ts` (uses `pgTable`, `serial`, `boolean` from `drizzle-orm/pg-core`).
- Connection via `DATABASE_URL` env var (Supabase pooled connection string, port 6543).
- After any schema change: `pnpm db:push` (no migration files needed for dev).
- DB connection is lazily initialized — safe during build even without `DATABASE_URL`.
- Seed: `pnpm db:seed` or `pnpm db:seed --demo=<pack>`. Data persists across deploys.
- For API-based demo reset: `seedDatabase(db, packName)` exported from `db/seed.ts`.

---

## Authentication

`lib/auth.ts` — cookie-based sessions.

```ts
const user = await requireAuth();          // throws redirect to /login if not authed
const user = await getSessionUser();       // returns null if not authed
await requireRole(["admin", "mapper"]);    // throws redirect to /unauthorized if wrong role
```

**Role hierarchy** (higher = more access):
```
system_admin: 100 → admin: 80 → approver: 60 → coordinator: 50 → mapper: 40 → viewer: 20
```

Session cookie: `airm_session` (httpOnly, 24h expiry). Middleware uses an **allowlist** of authenticated route prefixes — only known app routes require a session cookie. Unknown routes pass through to Next.js (renders branded 404 page). Public pages: `/`, `/login`, `/setup`, `/methodology`, `/overview`, `/quick-reference`, `/review`, `/api/auth/*`, `/api/health`.

**Password policy:** 12-char minimum, uppercase + lowercase + digit + special character. Validated in `lib/password-policy.ts`. Enforced on user creation and password change.

**Account lockout:** 5 failed attempts per username triggers 5-minute lockout. Tracked in-memory per-account (not global IP-based).

**Action permissions by role:**
| Action | system_admin | admin | mapper | approver | coordinator | viewer |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| Generate Personas | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Auto-Map Roles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Run SOD Analysis | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pipeline Jobs (run) | ✅ | ✅ | ✅ | badge | badge | badge |
| Edit Role Assignments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Submit for Review | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve/Reject | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Send Back to Draft | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Bulk Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| See Within-Role SOD | ✅ | ✅ | security.lead | ✅ | ❌ | ❌ |

**Assignment workflow statuses:**
```
draft → [Submit for Review] → pending_review → [SOD Analysis] → sod_rejected | compliance_approved → [Approval] → approved
```
- `draft` — editable by mapper, not yet submitted
- `pending_review` — locked, awaiting SOD analysis
- `sod_rejected` — SOD conflicts found, needs resolution
- `compliance_approved` — SOD clean, ready for approver
- `ready_for_approval` — auto-promoted high-confidence assignments
- `approved` — final, provisioned

---

## Org-unit scoping

`lib/scope.ts` — determines what data a user can see.

```ts
const userIds = await getUserScope(appUser);          // null = no restriction (admin)
const depts   = await getUserScopeDepartments(appUser); // array of department names
```

- `null` means "see everything" (admin/system_admin).
- Mapper, approver, and coordinator are scoped to their `assignedOrgUnitId` and all descendant org units.
- Coordinator has no legacy `workAssignments` fallback — if `assignedOrgUnitId` is null, returns `[]`.
- Always filter queries with `inArray(schema.users.id, scopedUserIds)` when `scopedUserIds !== null`.

---

## Settings

`lib/settings.ts` — key-value project config stored in `systemSettings` table.

```ts
import { getSetting, setSetting, getAllSettings } from "@/lib/settings";

const threshold = parseInt(await getSetting("least_access_threshold") ?? "30", 10);
await setSetting("least_access_threshold", "50");
```

Do NOT add a duplicate `getSystemSetting` in `queries.ts` — use `getSetting` from `lib/settings.ts`.

---

## Key patterns

### Server components (pages)
Pages are async server components. They call DB queries directly — no API round-trip needed for reads. Mutations go through API routes.

```ts
// app/some-page/page.tsx
export const dynamic = "force-dynamic"; // prevent static caching
export default async function SomePage() {
  const user = await requireAuth();
  const data = await getMyQuery();       // async DB call
  return <ClientComponent data={data} />;
}
```

### Client components
Add `"use client"` at top. Use `useRouter().refresh()` after mutations to re-fetch server data without a full page reload.

### API routes (mutations)
All write operations go through `/app/api/**`. Pattern:
```ts
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  // validate, write to DB, return result
}
```

---

## Queries (`lib/queries.ts`)

Central file for all shared DB queries. Key functions:

| Function | Returns |
|----------|---------|
| `getDashboardStats()` | Aggregate counts for KPI cards and strapline |
| `getDepartmentMappingStatus()` | Per-department stage breakdown |
| `getSourceSystemStats()` | Per-system role/user counts |
| `getLeastAccessAnalysis(threshold)` | Over-provisioned mappings with exception status |
| `getPersonaIdsForUsers(userIds)` | Persona IDs belonging to a set of users |
| `getPersonaDetail(personaId)` | Full persona with mapped roles and excess % |
| `getUserGapAnalysis(userId)` | Source vs target permission gaps per user |
| `getUserRefinementDetails()` | All users with assignments, overrides, status for mapping tab |

When adding new queries, add them here (not inline in page files) unless they're trivial single-row lookups.

---

## Strapline (`lib/strapline.ts`)

Rule-based, opinionated status generator — no AI API call. Called in `app/dashboard/page.tsx`.

- `projectStrapline()` — project-level status for all roles
- `areaStrapline()` — scoped status for mapper/approver/coordinator
- Returns `{ project, area, tone }` where tone drives the banner colour and icon
- Language is **direct and prescriptive**: names the bottleneck, tells users what to do

---

## Provisioning Alerts (formerly "Least Access")

- **Dashboard**: `DashboardFiltered` receives `overprovisioningAlerts` computed in `app/dashboard/page.tsx`, scoped to the user's org unit. Shows inline accept/revoke workflow.
- **Full detail page**: `/least-access` still exists as a route but is not in the sidebar nav.
- **Exceptions API**: `POST/DELETE /api/least-access/exceptions`
- **Threshold setting**: `least_access_threshold` (default 30%) in admin console.
- The concept is called "Provisioning Alerts" in all UI text — avoid "least access" in new user-facing strings.

---

## Notifications (demo mode)

No email is sent — all notifications are stored in the `notifications` table.

- Coordinators, admins, and system_admins can compose and send to mappers/approvers.
- Recipients see notifications in their inbox at `/notifications`.
- Unread count shown as a badge in the sidebar (computed client-side from inbox length).
- `POST /api/notifications` — send (accepts array of `toUserIds`)
- `PATCH /api/notifications` — mark as read

---

## Pipeline Validation (due diligence)

System-admin-only feature at `/admin/validation` for proving the platform works as described. Not part of the product workflow — intended for due diligence, partner demos, and accuracy audits.

**Dashboard** (`app/admin/validation/validation-dashboard.tsx`):
- **Overview tab** — Pipeline flow visualization (users → personas → roles → SOD), stat cards, persona distribution chart, confidence histogram, status breakdown, edge case panel
- **Users tab** — Full searchable/filterable user table. Click any row to open a detail modal showing the complete attribution chain: source attributes → persona (with AI reasoning + confidence) → target roles (with status) → SOD conflicts
- **Personas tab** — Per-persona cards with user counts, confidence stats, and mapped target roles

**Filters**: search by name/ID/department/persona, filter by specific persona, filter by edge case category (no persona, low confidence, high SOD, complex user, etc.)

**Excel export** (`/api/admin/validation/export`): 5-tab XLSX — Validation Summary, Full Attribution Chain (all users × 17 columns with validation flags), Persona Distribution, SOD Conflicts, Methodology.

**API** (`/api/admin/validation`): Returns the full enriched dataset including per-user chain, distribution stats, confidence buckets, edge case counts, and persona-role mappings.

**Access**: `system_admin` only. Sidebar link under SYSTEM section. Auth handled by existing `/admin` prefix in middleware.

---

## UI conventions

- **shadcn/ui** components live in `components/ui/`. There is **no `Checkbox` component** — use `<input type="checkbox" className="h-4 w-4 accent-primary" />`.
- Toast notifications use **Sonner** (`import { toast } from "sonner"`).
- Icons from **lucide-react** only.
- `cn()` utility from `@/lib/utils` for conditional class merging.
- Colour tokens: emerald = success/approved, red = SOD conflict, orange = over-provisioning/warning, yellow = low confidence, blue = info/existing access.

---

## Cursus Alignment (Dual-SKU Architecture)

Provisum is one of three SKUs in a shared product family with Cursus, an organizational intelligence platform. The architectural alignment spec lives in `docs/Provisum_Cursus_Architectural_Alignment.md`. **Read that document before making schema changes, adding tables, or modifying the persona model.**

### Product relationship

| SKU | Description |
|-----|-------------|
| Provisum Standalone | This codebase. Security role mapping for ERP migrations. |
| Cursus | OCM + organizational intelligence. No role mapping. |
| Cursus + Role Mapping | Full platform with Provisum embedded as a module. |

When embedded in Cursus, Provisum-specific tables use the `rm_` prefix. Shared tables (organizations, personas, programs, releases, audit_log) have no prefix and are owned by the shared schema.

### Program > Release hierarchy

Provisum uses a **Program → Release** hierarchy. A program is the migration initiative (e.g., "SAP S/4HANA Migration - North America"). Releases are go-live waves within it.

- Every release must have a `program_id` FK. There are no orphan releases.
- Programs have a nullable `portfolio_id` column. **Do not build portfolio management UI in Provisum.** This FK exists solely as an integration seam for Cursus to populate when embedding. In standalone Provisum it is always null.
- When creating a new org, auto-create a default program. Users can create additional programs later.

### Multi-tenancy

- Every top-level entity table has an `organization_id` FK (NOT NULL) referencing `organizations`.
- Junction tables and assignment tables inherit tenant scope through their parent FKs and do not need a direct `organization_id`.
- All queries must be organization-scoped. Never return data across organizations.
- RLS policies on Supabase enforce tenant isolation at the database level.

### Persona model (shared with Cursus)

Personas are the primary shared entity between Provisum and Cursus. The rules:

- Provisum is the **source of truth** for security persona attributes: `name`, `businessFunction`, `consolidatedGroupId`, `source`, `isActive`, permission weights, user assignments, confidence scores.
- Cursus is the source of truth for change management attributes: `change_history`, `technology_proficiency`, `parent_persona_id`, stakeholder group links.
- The `source` enum on personas must include: `ai`, `manual`, `hris_import`. Do not remove or rename these values.
- Provisum exports personas to Cursus via `GET /api/integration/personas`. The export payload includes `business_function` and `consolidated_group_name` to power matching on the Cursus side.
- Sync is **one-directional: Provisum → Cursus**. Provisum does not receive persona data back from Cursus.
- In embedded mode (Cursus + Role Mapping SKU), the role mapping module reads and writes the shared `personas` table directly. There is no separate `rm_personas` table. Security-specific tables (`rm_persona_source_permissions`, `rm_user_persona_assignments`) FK to `personas.id`.

### Schema rules for Cursus compatibility

1. **Use UUIDs for all primary keys.** Cursus uses `uuid` PKs everywhere. Provisum tables that still use `serial`/`integer` PKs must be migrated to `uuid` with `defaultRandom()`.

2. **Every table must have `created_at` and `updated_at` timestamps** (`timestamptz`, defaultNow).

3. **Enum values use snake_case.** Match Cursus convention: `in_progress` not `inProgress`, `ai_inferred` not `aiInferred`.

4. **Column names use snake_case in the database.** Drizzle maps these to camelCase in TypeScript. Do not rename DB columns to camelCase.

5. **Audit log entries must include `organization_id`.** Every auditable action must write to `audit_log` with the org context.

6. **Do not create tables that duplicate Cursus shared tables.** If Cursus already has a table for a concept (organizations, personas, programs, releases, notifications, audit_log), use the same structure. Check the Cursus schema at `docs/Provisum_Cursus_Architectural_Alignment.md` Section 6 for the full shared vs. prefixed table list.

7. **New Provisum-only tables should be designed as `rm_`-prefixable.** When naming a new table, verify it would make sense with an `rm_` prefix in the embedded module context. If the concept is shared (org-level, not security-specific), it should go in the shared schema, not a Provisum-only table.

### Release status enum (aligned superset)

The release status enum covers both Provisum and Cursus lifecycle states:

```
planning → in_progress → approved → deployed → stabilizing → completed → archived → cancelled
```

- `approved` is Provisum-specific (security mapping approval gate). Cursus releases skip this state.
- `deployed` and `stabilizing` are Cursus-originated states that Provisum should support for go-live tracking.
- `cancelled` replaces `archived` for releases that were abandoned (not completed).

### Integration API convention

External integration endpoints live under `/api/integration/`. These are REST (not tRPC), Zod-validated, and return JSON. They serve two consumers:

1. **Cursus** — reads Provisum personas, claims programs via `portfolio_id`, etc.
2. **External systems** — GRC exports, provisioning pushes (existing).

All integration endpoints must validate an API key (`PROVISUM_API_KEY` env var) in the `Authorization` header. Do not expose integration endpoints without auth.

### What NOT to do

- **Do not add a portfolio management UI.** Portfolios are a Cursus concept. The `portfolio_id` FK is an integration hook, not a Provisum feature.
- **Do not create a separate personas table for Cursus sync.** Personas are one table, one source of truth. Security metadata goes in `rm_`-prefixed tables that FK to the shared `personas.id`.
- **Do not hardcode single-tenant assumptions.** Every query should include `organization_id` in its WHERE clause (or rely on RLS). Never assume there is only one organization.
- **Do not build Cursus-to-Provisum sync.** The sync direction is Provisum → Cursus only. If you find yourself needing to pull data from Cursus into Provisum, stop and reconsider the architecture.
- **Do not rename the `releases` table or its scoping junction tables** (`release_users`, `release_org_units`, etc.). These are Provisum-specific and well-established. They will be prefixed `rm_` in embedded mode but keep their current names in standalone.

---

## Common gotchas

1. **`inArray` with nullable types** — always filter nulls first:
   ```ts
   .filter((id): id is number => id !== null)
   ```

2. **`new Set` iteration** — use `Array.from(new Set(...))` for ES target compatibility, not spread.

3. **Multiple Edit matches** — when editing `queries.ts`, always include enough surrounding context lines to uniquely identify the location.

4. **`isActive` field** — when selecting `appUsers`, if you don't need `isActive` in the returned type, select it and strip it with `.map(({ isActive: _ia, ...rest }) => rest)`.

5. **Schema changes require `pnpm db:push`** — don't forget after adding tables or columns.

6. **`force-dynamic`** — any page that reads from the DB or session must have `export const dynamic = "force-dynamic"` or it will be statically cached at build time.

7. **Deployment (current)** — Vercel (target). Database: Supabase Postgres (persistent, managed). Required env vars: `DATABASE_URL` (Supabase pooled connection string), `ANTHROPIC_API_KEY`, `ENCRYPTION_KEY`. Data persists across deploys — run `pnpm db:push` once to create tables, then `pnpm db:seed` to seed initial data. AI pipeline routes have `maxDuration = 300` for Vercel.

8. **AI pipeline** — Persona generation uses a 2-phase approach: AI analyzes a 100-user sample to design personas, then programmatic permission-overlap matching assigns all users. This prevents JSON truncation. Jobs run fire-and-forget in background; client polls `/api/jobs/[id]` for status.

9. **Self-guided demo accounts** — `demo.admin`, `demo.mapper.finance`, `demo.approver`, `demo.viewer`, `demo.coordinator` (all password `DemoGuide2026!`). Always created in every seed. Quick-login pills shown on login page.

---

## File map for common tasks

| Task | Files to touch |
|------|---------------|
| Add a setting | `lib/settings.ts` (document key), `app/admin/admin-console-client.tsx` |
| Add a new role | `lib/auth.ts` (ROLE_HIERARCHY), `lib/scope.ts`, `app/admin/users/users-client.tsx` |
| Add a DB table | `db/schema.ts`, then `pnpm db:push` |
| New dashboard section | `app/dashboard/page.tsx` (data), `app/dashboard/dashboard-filtered.tsx` (UI) |
| New sidebar nav item | `components/layout/sidebar.tsx` |
| New API mutation | `app/api/<path>/route.ts` |
| Validation dashboard | `app/admin/validation/`, `app/api/admin/validation/` |
| Change strapline language | `lib/strapline.ts` |
| Change notification template | `app/notifications/notifications-client.tsx` (QUICK_MESSAGES) |
