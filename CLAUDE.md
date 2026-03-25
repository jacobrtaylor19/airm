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

**SQLite via Drizzle ORM + `better-sqlite3`.** All queries are synchronous.

```ts
// Pattern: always use .get() for single row, .all() for multiple
const row = db.select({...}).from(schema.table).where(...).get();
const rows = db.select({...}).from(schema.table).where(...).all();
```

- Schema lives in `db/schema.ts` — single source of truth.
- After any schema change: `pnpm db:push` (no migration files needed for dev).
- Never use `db.run()` directly for queries — always use the query builder.
- Foreign keys are enabled. Deletes may cascade.
- WAL mode is on. The DB file is `airm.db` at the project root (gitignored).

---

## Authentication

`lib/auth.ts` — cookie-based sessions.

```ts
const user = requireAuth();          // throws redirect to /login if not authed
const user = getSessionUser();       // returns null if not authed
requireRole(["admin", "mapper"]);    // throws redirect to /unauthorized if wrong role
```

**Role hierarchy** (higher = more access):
```
system_admin: 100 → admin: 80 → approver: 60 → coordinator: 50 → mapper: 40 → viewer: 20
```

Session cookie: `airm_session` (httpOnly, 24h expiry). Middleware validates on every request except `/login`, `/setup`, `/api/auth/*`.

---

## Org-unit scoping

`lib/scope.ts` — determines what data a user can see.

```ts
const userIds = getUserScope(appUser);          // null = no restriction (admin)
const depts   = getUserScopeDepartments(appUser); // array of department names
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

const threshold = parseInt(getSetting("least_access_threshold") ?? "30", 10);
setSetting("least_access_threshold", "50");
```

Do NOT add a duplicate `getSystemSetting` in `queries.ts` — use `getSetting` from `lib/settings.ts`.

---

## Key patterns

### Server components (pages)
Pages are server components by default. They call DB queries directly — no API round-trip needed for reads. Mutations go through API routes.

```ts
// app/some-page/page.tsx
export const dynamic = "force-dynamic"; // prevent static caching
export default function SomePage() {
  const user = requireAuth();
  const data = getMyQuery();            // direct DB call, synchronous
  return <ClientComponent data={data} />;
}
```

### Client components
Add `"use client"` at top. Use `useRouter().refresh()` after mutations to re-fetch server data without a full page reload.

### API routes (mutations)
All write operations go through `/app/api/**`. Pattern:
```ts
export async function POST(req: NextRequest) {
  const user = getSessionUser();
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

## UI conventions

- **shadcn/ui** components live in `components/ui/`. There is **no `Checkbox` component** — use `<input type="checkbox" className="h-4 w-4 accent-primary" />`.
- Toast notifications use **Sonner** (`import { toast } from "sonner"`).
- Icons from **lucide-react** only.
- `cn()` utility from `@/lib/utils` for conditional class merging.
- Colour tokens: emerald = success/approved, red = SOD conflict, orange = over-provisioning/warning, yellow = low confidence, blue = info/existing access.

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
| Change strapline language | `lib/strapline.ts` |
| Change notification template | `app/notifications/notifications-client.tsx` (QUICK_MESSAGES) |
