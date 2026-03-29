# Provisum — Technical Debt Register

**Generated:** 2026-03-28 | **Version:** v0.7.0 | **Codebase:** 37+ pages, ~100 files, Supabase Postgres + Vercel

---

## Scoring Method

Each item scored on three axes (1–5):
- **Impact** — How much does it slow the team / degrade the product? (5 = critical)
- **Risk** — What happens if we ignore it? (5 = production incident or security breach)
- **Effort** — How hard to fix? (1 = trivial, 5 = multi-sprint)

**Priority = (Impact + Risk) × (6 − Effort)**

Higher score = fix first.

---

## Prioritized Debt Items

### Tier 1 — Fix Now (Score ≥ 30)

| # | Item | Category | Impact | Risk | Effort | Score | Files |
|---|------|----------|:------:|:----:|:------:|:-----:|-------|
| 1 | ~~**Zero test coverage**~~ ✅ STARTED — Vitest installed, 41 smoke tests across auth, settings, strapline, middleware. Still needs integration + E2E. | Test | 5 | 5 | 4 | 20 | `__tests__/` |
| 2 | ~~**No error tracking**~~ ✅ INSTALLED — `@sentry/nextjs` configured (client/server/edge), `global-error.tsx`, `lib/monitoring.ts` wired. ⚠️ Needs `NEXT_PUBLIC_SENTRY_DSN` env var set on Vercel. | Infrastructure | 4 | 5 | 2 | 36 | `sentry.*.config.ts`, `lib/monitoring.ts` |
| 3 | ~~**N+1 queries in AI pipeline**~~ ✅ FIXED — Extracted bulk loader in `lib/ai/load-user-profiles.ts` (3 queries total). | Code | 5 | 4 | 3 | 27 | `lib/ai/load-user-profiles.ts` |
| 4 | ~~**No database indexes**~~ ✅ FIXED — 56 indexes created across all 39 tables via Supabase MCP. | Architecture | 4 | 5 | 2 | 36 | Supabase (no code change) |
| 5 | **In-memory rate limiter** — Single-instance only. TODO comment acknowledges this. Vercel runs multiple isolates. | Infrastructure | 3 | 5 | 2 | 32 | `lib/rate-limit.ts` |

### Tier 2 — Fix This Sprint (Score 20–29)

| # | Item | Category | Impact | Risk | Effort | Score | Files |
|---|------|----------|:------:|:----:|:------:|:-----:|-------|
| 6 | ~~**Monolithic `queries.ts`**~~ ✅ FIXED — Split into 11 domain modules in `lib/queries/` with barrel re-export. | Code | 4 | 3 | 4 | 14 | `lib/queries/` |
| 7 | ~~**Hardcoded route allowlist in middleware**~~ ✅ FIXED — Inverted to default-secure model with exact-match Set + prefix array. | Architecture | 3 | 5 | 2 | 32 | `middleware.ts` |
| 8 | **No staging environment** — Pushes to `main` deploy directly to production. No pre-prod verification. | Infrastructure | 3 | 4 | 2 | 28 | `.github/workflows/` |
| 9 | ~~**Duplicate interfaces in AI modules**~~ ✅ FIXED — Extracted to `lib/ai/types.ts` + shared bulk loader. | Code | 2 | 2 | 1 | 20 | `lib/ai/types.ts` |
| 10 | **Large client components** — `mapping-client.tsx` (1,286 lines), `admin-console-client.tsx` (1,234 lines), `sod-client.tsx` (900 lines). | Code | 3 | 2 | 4 | 10 | `app/mapping/`, `app/admin/`, `app/sod/` |

### Tier 3 — Plan for Next Release (Score 10–19)

| # | Item | Category | Impact | Risk | Effort | Score | Files |
|---|------|----------|:------:|:----:|:------:|:-----:|-------|
| 11 | **No API documentation** — 44 API routes with no OpenAPI/Swagger spec. Integration partners must read source. | Documentation | 3 | 2 | 3 | 15 | `app/api/` |
| 12 | **Fire-and-forget AI jobs** — Background jobs use `waitUntil()` with no retry, dead-letter, or status recovery. | Architecture | 3 | 3 | 4 | 12 | `app/api/ai/*/route.ts` |
| 13 | **No structured logging** — All logging via `console.error`. No correlation IDs, no log levels, no aggregation. | Infrastructure | 2 | 3 | 2 | 20 | All API routes |
| 14 | **Upload route type safety** — File-level `@typescript-eslint/no-explicit-any` disable on 727-line CSV upload handler. | Code | 2 | 3 | 3 | 15 | `app/api/upload/[type]/route.ts` |
| 15 | ~~**CI audit non-blocking**~~ ✅ FIXED — Removed `continue-on-error: true` from security-scan job. | Infrastructure | 2 | 4 | 1 | 30 | `.github/workflows/ci.yml` |
| 16 | **No encryption key rotation** — `ENCRYPTION_KEY` for AES-256-GCM has no rotation mechanism or docs. | Infrastructure | 1 | 3 | 3 | 12 | `lib/encryption.ts` |

### Tier 4 — Backlog (Score < 10)

| # | Item | Category | Impact | Risk | Effort | Score | Files |
|---|------|----------|:------:|:----:|:------:|:-----:|-------|
| 17 | **10 eslint-disable comments** — Mostly `no-unused-vars`; 1 file-level `no-explicit-any`. | Code | 1 | 1 | 1 | 10 | Various |
| 18 | **Console.log in production** — 68+ statements (mostly in seed script, acceptable; ~10 in API routes). | Code | 1 | 1 | 1 | 10 | `app/api/ai/`, `lib/` |
| 19 | **No ER diagram** — Schema is well-structured but lacks a visual diagram for onboarding. | Documentation | 1 | 1 | 2 | 8 | `db/schema.ts` |
| 20 | **No feature flags** — Mentioned in docs but not implemented. Needed for gradual rollouts. | Architecture | 1 | 1 | 3 | 6 | — |

---

## Phased Remediation Plan

### Phase 1: Production Hardening (1 week, alongside feature work)

**Goal:** Reduce production risk without blocking feature development.

| Task | Effort | Owner Notes |
|------|--------|-------------|
| Add database indexes for hot query paths (`user_id`, `status`, `persona_id` on assignments, conflicts, mappings) | 2h | Run `CREATE INDEX` via Supabase MCP. No code change needed. |
| Install Sentry + wire into `lib/monitoring.ts` | 2h | `pnpm add @sentry/nextjs`, init in `instrumentation.ts`, replace TODO stubs |
| Make CI audit blocking | 15m | Remove `continue-on-error: true` from security-scan job |
| Add Vitest + first smoke tests for `lib/auth.ts` and `lib/queries.ts` | 4h | `pnpm add -D vitest @vitejs/plugin-react`, add `vitest.config.ts`, write 10-15 tests |
| Extract `UserAccessProfile` to shared `lib/ai/types.ts` | 30m | Move interface + shared query helpers |

### Phase 2: Architecture Cleanup (2 weeks, sprint work)

**Goal:** Break monoliths, optimize queries, add safety nets.

| Task | Effort | Owner Notes |
|------|--------|-------------|
| Split `lib/queries.ts` into domain modules (`queries/dashboard.ts`, `queries/personas.ts`, `queries/sod.ts`, `queries/approvals.ts`, etc.) | 6h | Re-export from `lib/queries.ts` for backward compat |
| Fix N+1 queries in AI pipeline — bulk-load source role assignments + permissions in 2 queries instead of nested loops | 4h | Same pattern as `getAggregateRiskAnalysis` fix |
| Add preview/staging deploy via Vercel branch deploys | 2h | Configure `develop` branch as preview environment |
| Replace in-memory rate limiter with Supabase-backed (or Upstash Redis) | 3h | Query `rate_limit_attempts` table or use Upstash |
| Invert middleware auth — default to "require auth", explicitly allowlist public paths only | 3h | Safer default; new routes auto-protected |

### Phase 3: Test Coverage (ongoing, 2h/week target)

**Goal:** Build coverage incrementally. Target 60% on core libs, 40% overall by v0.8.0.

| Priority | Target | Tests |
|----------|--------|-------|
| 1 | `lib/auth.ts` | requireAuth, requireRole, getSessionUser with mock Supabase |
| 2 | `lib/scope.ts` | getUserScope for each role, org-unit hierarchy traversal |
| 3 | `lib/queries.ts` (top 10 functions) | getDashboardStats, getAggregateRiskAnalysis, getLeastAccessAnalysis |
| 4 | `app/api/auth/login/route.ts` | Success, invalid creds, lockout, disabled user |
| 5 | `middleware.ts` | Public path pass-through, auth redirect, header injection |
| 6 | API route handlers | Upload validation, approval state machine, SOD analysis |
| 7 | E2E (Playwright) | Login → dashboard → mapping → approve flow |

### Phase 4: Documentation & Polish (as-needed)

| Task | Effort |
|------|--------|
| Generate OpenAPI spec from route handlers (or write manually) | 4h |
| Create ER diagram from `db/schema.ts` | 1h |
| Write incident response runbook | 2h |
| Document AI pipeline internals (2-phase persona generation, confidence scoring) | 2h |
| Clean up eslint-disable comments and type the upload route properly | 3h |

---

## Current Health Summary (updated 2026-03-28)

| Category | Grade | Key Issue |
|----------|:-----:|-----------|
| **Code** | B | Queries split into 11 modules; AI N+1 eliminated; 3 large client components remain |
| **Architecture** | B+ | Default-secure middleware; 56 DB indexes; scoped queries push filters to DB |
| **Testing** | D+ | 41 smoke tests (auth, settings, strapline, middleware); no integration or E2E |
| **Dependencies** | A- | Current versions; Sentry + Resend installed |
| **Documentation** | B+ | Strong dev docs; missing API spec + runbook |
| **Infrastructure** | B- | Sentry installed (needs DSN); no staging; in-memory rate limiter |

**Overall: B** — Production-ready for demo. 10 of 20 debt items resolved. Sentry activation (env var) and test expansion are the priority gaps.

### Resolved This Sprint
- ✅ #1 — Test coverage started (41 smoke tests via Vitest)
- ✅ #2 — Sentry error tracking installed (needs DSN env var)
- ✅ #3 — N+1 queries in AI pipeline (bulk loader)
- ✅ #4 — Database indexes (56 indexes across all tables)
- ✅ #6 — Monolithic queries.ts (split into 11 modules)
- ✅ #7 — Hardcoded route allowlist (inverted to default-secure)
- ✅ #9 — Duplicate AI interfaces (shared types.ts)
- ✅ #15 — CI audit non-blocking (now fails build)
- ✅ Scoped queries (approvals + users) now filter at DB level
- ✅ User invite flow with Resend email integration
