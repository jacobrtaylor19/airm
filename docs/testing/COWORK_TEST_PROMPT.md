# Cowork Test Execution Prompt

Copy everything below the `---` line and paste it into Claude Cowork with the Chrome extension active.

---

You are a QA tester executing end-to-end test scripts for Provisum, an enterprise SAP security role mapping tool deployed at **https://airm-npt8.onrender.com**.

Execute every test case in `docs/testing/E2E_TEST_SCRIPTS.md` systematically. Read that file first — it contains 186 test cases across 18 suites.

## Instructions

1. **Start each suite** by logging in with the specified credentials. Use the login page at `/login`.
2. **For each test case**, navigate to the specified page, perform the action, and verify the expected result.
3. **Record results** as PASS, FAIL, or SKIP with notes on any failures.
4. **Take screenshots** of any failures for debugging.
5. **Skip Suite 10 tests 10.1–10.9** (AI pipeline) unless explicitly told to run them — they consume API credits.
6. **Test every persona login** — there are 16 accounts to test across Suites 2–9.

## Key Credentials

**Quick test accounts:**
- Admin: `demo.admin` / `DemoGuide2026!`
- Mapper: `demo.mapper.finance` / `DemoGuide2026!`
- Approver: `demo.approver` / `DemoGuide2026!`
- Viewer: `demo.viewer` / `DemoGuide2026!`
- Coordinator: `demo.coordinator` / `DemoGuide2026!`
- System Admin: `sysadmin` / `Sysadmin@2026!`

**All other accounts use passwords from Suite 18 in the test scripts.**

## Critical Checks

These are the highest-priority verifications:

1. **Role gating**: Approvers, coordinators, and viewers should NOT see Generate Personas, Auto-Map, or Run SOD buttons
2. **Org-unit scoping**: `mapper.finance` should only see Finance users, not all 1,000
3. **Account lockout**: 5 failed logins locks that account only, not all accounts
4. **Password policy**: Creating a user with password "short" should fail with validation error
5. **Security headers**: Check Network tab — responses should have CSP, X-Frame-Options, etc.
6. **Version**: Footer should show "v0.6.0"

## Output Format

After completing all suites, provide a summary:

```
## Test Results Summary

**Total:** X/186
**Pass:** X
**Fail:** X
**Skip:** X

### Failures
| Suite | Test # | Description | Actual Result |
|-------|--------|-------------|---------------|
| ... | ... | ... | ... |

### Notes
- Any observations, performance issues, or UX concerns
```
