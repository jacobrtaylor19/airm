# Cowork Test Execution Prompt

Copy everything below this line and paste it into Claude Cowork with the Chrome extension active.

---

## Prompt

You are a QA tester executing end-to-end test scripts for Provisum, an enterprise SAP security role mapping tool. The app is deployed at **https://airm-npt8.onrender.com**.

Your job is to systematically execute every test case in the test script below, documenting PASS/FAIL with screenshots for each. Work through the suites in order.

### Test Credentials

| Username | Password | Role | Scope |
|----------|----------|------|-------|
| `sysadmin` | `Sysadmin@2026!` | system_admin | Full access |
| `admin` | `AdminPass@2026!` | admin | Full access |
| `mapper.finance` | `Provisum@2026!` | mapper | Finance dept |
| `mapper.maintenance` | `Provisum@2026!` | mapper | Maintenance dept |
| `mapper.procurement` | `Provisum@2026!` | mapper | Procurement dept |
| `approver.finance` | `Provisum@2026!` | approver | Corporate Services |
| `approver.operations` | `Provisum@2026!` | approver | Operations |
| `viewer` | `Provisum@2026!` | viewer | Read-only |
| `security.lead` | `Security@2026!` | mapper | All depts |
| `compliance.officer` | `Compliance@2026!` | approver | All depts |
| `grc.analyst` | `GrcAnalyst@2026!` | viewer | All depts |

### Instructions

1. **Navigate to** https://airm-npt8.onrender.com
2. **Execute each test suite** in order (Suite 1 through Suite 11)
3. **For each test case:**
   - Perform the steps exactly as described
   - Compare actual behavior to the **Expected** result
   - Record **PASS** or **FAIL**
   - If FAIL, note what actually happened
   - Take a screenshot of key screens
4. **Between personas:** Log out (sidebar bottom), then log in as the next user
5. **Account lockout warning:** Test 1.3 intentionally locks the `viewer` account. After that test, use `grc.analyst` / `GrcAnalyst@2026!` as the viewer substitute for Suite 7.
6. **AI pipeline tests (8.4-8.6):** These modify demo data. SKIP them unless I tell you otherwise — mark as SKIPPED.
7. **After all tests:** Compile a summary report with:
   - Total: X passed, Y failed, Z skipped
   - List of all failures with test ID, expected vs actual, and screenshot
   - List of any observations or UX issues noticed during testing

### Test Suites

Execute these 11 suites covering 95 test cases:

**Suite 1: Authentication & Security (14 tests)** — Login as `sysadmin`. Test valid/invalid login, account lockout, password policy, logout, session security, security headers, health endpoint, rate limiting, password change, input validation.

**Suite 2: System Admin Workflow (16 tests)** — Stay as `sysadmin`. Test dashboard KPIs, department grid, provisioning alerts, Config Console (settings, users, org units), admin users/assignments pages, audit log, data upload page, source/target roles, SOD rules, releases.

**Suite 3: Mapper Workflow — Finance (15 tests)** — Log in as `mapper.finance`. Test dashboard scoping, sidebar restrictions, scoped users/personas/mapping pages, bulk assign, SOD analysis, approvals view, exports, inbox, quick reference, methodology.

**Suite 4: Mapper Workflow — Maintenance (5 tests)** — Log in as `mapper.maintenance`. Verify different scope than Finance, data isolation between mappers.

**Suite 5: Approver Workflow (12 tests)** — Log in as `approver.finance`. Test approval queue, approve/reject/bulk-approve, SOD escalation handling, scoped data, exports, inbox.

**Suite 6: Operations Approver (3 tests)** — Log in as `approver.operations`. Verify different queue and scope than Finance approver.

**Suite 7: Viewer — Read-Only (8 tests)** — Log in as `viewer` (or `grc.analyst` if locked). Verify read-only access, no edit buttons, admin access denied.

**Suite 8: AI Pipeline (8 tests)** — Log in as `sysadmin`. Test Lumen chatbot (Cmd+K), AI question answering, job history. SKIP tests 8.4-8.6 (data-modifying).

**Suite 9: Reports & Exports (8 tests)** — Log in as `admin`. Test Excel/PDF/CSV/SOD exports, release comparison, release timeline, audit log filtering.

**Suite 10: Navigation & UI (6 tests)** — Test all sidebar links, responsive layout, landing page, methodology, overview, 404 handling.

**Suite 11: Data Integrity (5 tests)** — Log in as `sysadmin`. Verify user count (10,000), source roles (~21), target roles (~18), SOD rules (~82), SOD conflicts (~37).

### Full Test Script Reference

The detailed step-by-step test cases with exact expected results are in:
`docs/testing/E2E_TEST_SCRIPTS.md`

Read that file for the full test script before beginning execution. Each test has a numeric ID (e.g., 1.1, 2.5, 7.3) — use these IDs in your report.

### Output Format

After completing all tests, provide a report in this format:

```
# Provisum E2E Test Report — [Date]

## Summary
- **Total:** 95 tests
- **Passed:** X
- **Failed:** Y
- **Skipped:** Z

## Failures
| Test ID | Test Name | Expected | Actual | Screenshot |
|---------|-----------|----------|--------|------------|
| X.X | ... | ... | ... | [screenshot] |

## Observations
- [Any UX issues, slow pages, visual glitches noticed during testing]
```

Begin testing now. Start with Suite 1, Test 1.1 — navigate to the login page.
