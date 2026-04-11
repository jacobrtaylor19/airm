# Provisum v1.4.0 — QA Testing Strategy

**Updated:** 2026-04-11
**Application:** Provisum (Intelligent Role Mapping for Enterprise Migrations)
**Version:** v1.4.0 (58 tables, 40+ pages, 9 modules, 105 API routes)
**URLs:** demo.provisum.io (demo) · app.provisum.io (prod) · provisum.io (sales site)
**Stack:** Next.js 14, Supabase Postgres (Drizzle ORM), Supabase Auth, Vercel

---

## 1. Testing Architecture

### 1.1 Test Layers

| Layer | Tool | Count | What It Covers |
|-------|------|-------|---------------|
| Unit | Vitest 4.1.2 | 92 tests / 9 files | Auth logic, SOD analysis, settings, middleware, exports, help articles |
| E2E | Playwright 1.58.2 | ~120+ tests / 17 specs | Full browser workflows, role-based access, API smoke tests |
| Manual | QA scripts | Per-release | Edge cases, visual regression, cross-browser |

### 1.2 E2E Infrastructure

- **Config:** `playwright.config.ts` — serial (`workers: 1`), 120s timeout, 1 retry, Chromium only
- **Global setup:** `e2e/global-setup.ts` — pre-authenticates 6 users, saves cookies to `e2e/.auth/`
- **Auth helper:** `e2e/helpers/auth.ts` — storage state (default), API fallback, form login
- **Dev vs CI:** Dev reuses existing server on port 3000; CI starts fresh, 3 workers
- **Heavy pages:** `/mapping`, `/sod`, `/calibration` need 45-90s timeouts under dev server load

### 1.3 Test Accounts

| Username | Password | Role | Scope |
|----------|----------|------|-------|
| demo.admin | DemoGuide2026! | admin | All data |
| demo.mapper.finance | DemoGuide2026! | mapper | Finance org unit |
| demo.mapper.operations | DemoGuide2026! | mapper | Operations org unit |
| demo.approver | DemoGuide2026! | approver | All data |
| demo.viewer | DemoGuide2026! | viewer | Read-only |
| demo.coordinator | DemoGuide2026! | coordinator | Assigned org unit |
| demo.pm | DemoGuide2026! | project_manager | All data (PM-level) |
| demo.compliance | DemoGuide2026! | compliance_officer | All data |
| demo.security | DemoGuide2026! | security_architect | All data |
| sysadmin | Sysadmin@2026! | system_admin | Full system access |

### 1.4 Test Data (Financial Services demo pack)

- 1,000 source users across departments
- 21 source roles (SAP ECC), 18 target roles (S/4HANA)
- 20 AI-generated personas, 37 mappings, 2130 assignments, 1173 SOD conflicts
- 92 SOD rules, org unit hierarchy (L1/L2/L3)
- 17 app users (10 seeded + 7 demo)

---

## 2. E2E Spec Coverage Map

### 2.1 Existing Specs (17 files)

| Spec File | Module | Tests | Roles Tested | Coverage |
|-----------|--------|-------|-------------|----------|
| `auth.spec.ts` | Auth | ~4 | admin, invalid | Login form, invalid creds, unauthorized redirect, role blocking |
| `dashboard.spec.ts` | Dashboard | ~3 | admin | Stat cards, sidebar nav, navigation |
| `demo-smoke.spec.ts` | Demo | ~28 | admin, mapper, viewer, approver | Auth, 10 pages, RBAC, API, data seeding |
| `mapping-workflow.spec.ts` | Mapping | ~3 | admin | Personas, mapping, SOD pages load |
| `sod-analysis.spec.ts` | SOD | ~10 | admin, mapper, approver, viewer | SOD page access, conflict data, summary stats |
| `approvals.spec.ts` | Approvals | ~2 | approver, viewer | Approver queue, viewer read-only |
| `notifications.spec.ts` | Notifications | ~3 | admin | Inbox access, sidebar link |
| `error-states.spec.ts` | Error | ~5 | admin | 404, disabled buttons, failed login |
| `role-access-matrix.spec.ts` | RBAC | ~10 | all roles | Admin blocked for 5 roles, calibration, positive checks |
| `admin-features.spec.ts` | Admin | ~8 | sysadmin | Admin console tabs, security design, audit log |
| `full-workflow.spec.ts` | Workflow | ~8 | admin, mapper | Page traversal (7 pages), mapping workflow |
| `workflow-transitions.spec.ts` | Workflow | ~10 | admin, mapper, approver | Status transitions, submit/approve/reject |
| `releases.spec.ts` | Releases | ~8 | admin, pm | Release CRUD, comparison, readiness |
| `risk-analysis.spec.ts` | Risk | ~8 | admin | Risk dashboard, permission changes, SOD cards |
| `workstream.spec.ts` | Workstream | ~8 | admin | Workstream features |
| `status-slide-export.spec.ts` | Export | ~6 | admin | Export functionality |
| `api-smoke.spec.ts` | API | ~15 | admin, viewer | Health, auth, CRUD, RBAC enforcement |

### 2.2 Coverage Gaps (to address)

| Gap | Priority | Notes |
|-----|----------|-------|
| Gap analysis / user access workbench (v1.4.0) | HIGH | New feature — confirm/undo, bulk review, change impact |
| Help/Knowledge Base | MEDIUM | `/help` page, article rendering, search |
| Support ticket form | MEDIUM | `/support` form submission |
| Module launcher (`/home`) | MEDIUM | 9 tile cards, navigation to each module |
| Calibration page | LOW | Threshold slider, bulk accept (partially covered in role-access-matrix) |
| Target role editing | LOW | Draft/active/archived lifecycle, approve/reject |
| Mitigating controls | LOW | SOD risk acceptance with control documentation |
| Demo mode detection | LOW | Hostname-based demo vs prod behavior |

---

## 3. Pass/Fail Criteria

### 3.1 Release Gate

| Metric | Threshold |
|--------|-----------|
| Unit tests passing | 100% |
| E2E tests passing | ≥ 95% (documented exceptions only) |
| Build succeeds | `pnpm build` exits 0 |
| No CRITICAL security findings | 0 |
| Sentry errors (last 24h) | < 5 unique |

### 3.2 Acceptable Failures

- Timing-dependent flaky tests (retry-passing on 2nd attempt)
- Dev server exhaustion after 35+ sequential tests (mitigated by storage state auth)
- Tests that depend on external services (Resend email delivery)

---

## 4. Running Tests

```bash
# Unit tests
pnpm test              # Run once
pnpm test:watch        # Watch mode

# E2E tests (Playwright auto-starts dev server if port 3000 is free)
pnpm test:e2e          # Headless, serial
pnpm test:e2e:ui       # Interactive UI mode

# Single spec
npx playwright test e2e/auth.spec.ts

# View last report
npx playwright show-report
```

### 4.1 Known Gotchas

1. **Port 3000 must be free** — Playwright starts its own dev server. Kill any existing process first.
2. **React hydration** — `fill()` before hydration doesn't update state. Use `click()` before `fill()` + `toBeEnabled()` check.
3. **Welcome tour overlay** — Dismiss "Skip Tour" before sidebar navigation.
4. **Strict mode selectors** — Scope sidebar links to `aside nav` with `{ exact: true }`.
5. **Admin console** — Requires `sysadmin` user (system_admin role), not `demo.admin` (admin role).
6. **Heavy pages** — `/mapping`, `/sod`, `/calibration` need extended timeouts (45-90s).

---

## 5. Security Testing Checklist

| Check | Method | Status |
|-------|--------|--------|
| Auth middleware default-secure | Code review | ✅ Verified |
| No SQL injection (parameterized queries) | Code review | ✅ Verified |
| No XSS (dangerouslySetInnerHTML safe) | Code review | ✅ Safe (static content only) |
| RLS enabled on all tables | Supabase advisor | ✅ Fixed (deny-all policies) |
| Cron endpoint timing-safe | Code review | ✅ Fixed |
| Secrets not in source | Code review | ✅ Clean |
| Security headers (HSTS, CSP, X-Frame-Options) | next.config.mjs | ✅ Configured |
| Rate limiting (Postgres-backed) | Code review | ✅ Verified |
| Password policy (12-char, complexity) | lib/password-policy.ts | ✅ Enforced |
| Account lockout (5 attempts) | Auth flow | ✅ Verified |

---

## 6. Performance Baselines

| Page | Expected Load (dev) | Timeout Config |
|------|-------------------|---------------|
| /dashboard | < 5s | 30s |
| /mapping | < 10s | 45s |
| /sod | < 10s | 45s |
| /calibration | < 10s | 45s |
| /admin | < 5s | 30s |
| /risk-analysis | < 8s | 30s |
| API /health | < 500ms | 5s |

---

*Supersedes: QA Testing Strategy v0.7.0 (2026-03-28). Manual test cases from v0.7.0 remain valid as reference for edge cases not covered by automated E2E tests.*
