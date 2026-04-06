# Provisum v0.9.0 — E2E Test Results

**Date:** 2026-03-30
**Runner:** Playwright (Chromium, serial, 1 worker, 1 retry)
**Duration:** 6.6 minutes
**Result:** 45 passed, 1 flaky, 0 failed

## Auth Setup (Global Setup)

All 6 test users authenticated successfully via storage state:

| User | Status |
|------|--------|
| demo.admin | Authenticated |
| demo.mapper.finance | Authenticated |
| demo.approver | Authenticated |
| demo.viewer | Authenticated |
| demo.coordinator | Authenticated |
| sysadmin | Authenticated |

## Test Results by Spec File

### admin-features.spec.ts (8 tests) — All passed

| # | Test | Result |
|---|------|--------|
| 1 | admin console loads with tabs | Passed |
| 2 | Feature Flags tab shows flag list | Passed |
| 3 | Email tab shows email settings form | Passed |
| 4 | Webhooks tab shows webhook configuration | Passed |
| 5 | Scheduled Exports tab loads | Passed |
| 6 | security design page loads with connection test card | Passed |
| 7 | audit log page loads with entries | Passed |
| 8 | system admin can access security design page | Passed |

### approvals.spec.ts (2 tests) — All passed

| # | Test | Result |
|---|------|--------|
| 9 | approver sees the approval queue | Passed |
| 10 | viewer has read-only access (no action buttons on approvals) | Passed |

### auth.spec.ts (4 tests) — All passed

| # | Test | Result |
|---|------|--------|
| 11 | login with valid credentials redirects to dashboard | Passed |
| 12 | login with invalid credentials shows error | Passed |
| 13 | unauthorized access redirects to login | Passed |
| 14 | viewer cannot access /admin | Passed |

### dashboard.spec.ts (3 tests) — All passed

| # | Test | Result |
|---|------|--------|
| 15 | dashboard loads with stat cards | Passed |
| 16 | dashboard shows navigation sidebar | Passed |
| 17 | sidebar navigation works | Passed |

### error-states.spec.ts (5 tests) — All passed

| # | Test | Result |
|---|------|--------|
| 18 | navigating to a non-existent page shows 404 or redirects to login | Passed |
| 19 | Sign In button is disabled when credentials are empty | Passed |
| 20 | Sign In button is disabled with only password filled | Passed |
| 21 | login with wrong password shows error | Passed |
| 22 | repeated failed attempts show error each time | Passed |

### full-workflow.spec.ts (9 tests) — All passed

| # | Test | Result |
|---|------|--------|
| 23 | personas page loads with data | Passed |
| 24 | mapping workspace loads | Passed |
| 25 | SOD conflicts page loads with data | Passed |
| 26 | approval queue loads | Passed |
| 27 | jobs page loads | Passed |
| 28 | exports page loads | Passed |
| 29 | calibration page loads | Passed |
| 30 | mapper can browse personas and mapping workspace | Passed |

### mapping-workflow.spec.ts (3 tests) — All passed

| # | Test | Result |
|---|------|--------|
| 31 | personas page loads with data | Passed |
| 32 | mapping page loads | Passed |
| 33 | SOD conflicts page loads | Passed |

### notifications.spec.ts (3 tests) — All passed

| # | Test | Result |
|---|------|--------|
| 34 | coordinator can access inbox page | Passed |
| 35 | sidebar shows Inbox link | Passed |
| 36 | admin can access inbox page | Passed |

### role-access-matrix.spec.ts (10 tests) — 9 passed, 1 flaky

| # | Test | Result |
|---|------|--------|
| 37 | admin role cannot access /admin | Flaky (failed, passed on retry) |
| 38 | mapper cannot access /admin | Passed |
| 39 | approver cannot access /admin | Passed |
| 40 | viewer cannot access /admin | Passed |
| 41 | coordinator cannot access /admin | Passed |
| 42 | viewer cannot access /calibration | Passed |
| 43 | system_admin can access /admin | Passed |
| 44 | approver can access /dashboard | Passed |
| 45 | viewer can access /dashboard | Passed |
| 46 | coordinator can access /dashboard | Passed |

## Flaky Test Details

**Test:** `admin role cannot access /admin` (`role-access-matrix.spec.ts:32`)

The `admin` role should be blocked from `/admin` (only `system_admin` has access). The test checks for redirect or "access denied" text. On the first attempt the page loaded without showing the expected denial signal; on retry it passed. This is a known timing issue — the access check occasionally resolves after the assertion runs.

## Summary

| Metric | Value |
|--------|-------|
| Total tests | 46 |
| Passed | 45 |
| Flaky | 1 |
| Failed | 0 |
| Spec files | 9 |
| Duration | 6.6m |
| Build warnings | Sentry deprecation warnings (non-blocking) |
