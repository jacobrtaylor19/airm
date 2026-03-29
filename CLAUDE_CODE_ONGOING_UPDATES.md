# Provisum — Ongoing Updates (Session State)

**Last updated:** 2026-03-28 | **Version:** v0.7.0 | **Build:** clean (zero errors, zero warnings)

---

## Latest Commit

```
d7c1da4 fix: push scoped filters to DB and harden middleware public path matching
```

Auto-deployed to https://demo.provisum.io via GitHub → Vercel pipeline.

---

## Recent Changes (This Session)

### QA Bug Fixes
- **BUG-001 — Login redirect race condition:** Changed `router.push("/dashboard")` → `window.location.href = "/dashboard"` to ensure browser processes Set-Cookie headers before the next request
- **Dashboard timeout (504):** Added `export const maxDuration = 60` to dashboard and 4 other heavy pages; wrapped `renderDashboard()` in try/catch with graceful retry UI
- **Dashboard query parallelization:** Reorganized heavy queries (risk analysis, scoped stats, overprovisioning alerts) to run concurrently via `Promise.all`
- **Version bump:** package.json `0.6.0` → `0.7.0`
- **demo.pm account:** Created in seed file + live Supabase DB (auth user + identity + app_users row)

### Tech Debt Remediation (6 of 20 items resolved)
1. **Queries split:** Monolithic `lib/queries.ts` (2,125 lines) → 11 domain modules in `lib/queries/` with barrel re-export
2. **N+1 elimination:** AI pipeline bulk loader in `lib/ai/load-user-profiles.ts` (3 queries instead of 2000+)
3. **Shared AI types:** `UserAccessProfile` extracted to `lib/ai/types.ts`
4. **Middleware hardened:** Inverted from route allowlist to default-secure; split public paths into exact-match Set + prefix array
5. **CI audit blocking:** Removed `continue-on-error: true` from security-scan job
6. **Scoped queries:** `getApprovalQueueScoped` and `getUsersScoped` now push `inArray` filter to SQL instead of fetch-all-then-filter

### Code Review Fixes
- Middleware: `PUBLIC_PATHS` prefix matching could expose routes like `/setup-admin` → fixed with exact-match Set for pages
- Approvals: `getApprovalQueueScoped` fetched all rows then filtered in JS → now filters at DB level
- Users: `getUsersScoped` same pattern → `getUsers(filterUserIds?)` accepts optional filter param

---

## Known Issues

- **No test coverage** — Vitest not yet installed. Zero unit/integration/E2E tests.
- **No error tracking** — `lib/monitoring.ts` has TODO stubs for Sentry.
- **No database indexes** — 39 tables, zero compound indexes on hot query paths.
- **In-memory rate limiter** — Single-instance only; Vercel runs multiple isolates.
- **No staging environment** — Pushes to `main` deploy directly to production.
- **Large client components** — `mapping-client.tsx` (1,286 lines), `admin-console-client.tsx` (1,234 lines) still need splitting.

---

## Architecture Notes

### Middleware Auth Model (default-secure)
```
PUBLIC_EXACT = Set(["/", "/login", "/setup", "/methodology", "/overview", "/quick-reference"])
PUBLIC_PREFIXES = ["/api/auth/", "/api/health", "/review/"]

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
└── audit.ts          # getAuditLog
```

### AI Pipeline Bulk Loading
```
lib/ai/types.ts              # UserAccessProfile interface
lib/ai/load-user-profiles.ts # 3 bulk queries: role assignments, role→perm junctions, permissions
                              # Assembles UserAccessProfile[] in-memory via Maps
                              # Used by both persona-generation.ts and persona-assignment.ts
```
