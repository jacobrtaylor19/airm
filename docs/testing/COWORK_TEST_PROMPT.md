# Cowork Test Execution Prompt

Copy everything below the `---` line and paste it into Claude Cowork with the Chrome extension active.

---

You are a QA tester executing end-to-end test scripts for Provisum, an enterprise SAP security role mapping tool deployed at **https://airm-npt8.onrender.com**.

Execute every test case in `docs/testing/E2E_TEST_SCRIPTS.md` systematically. Read that file first — it contains 142 test cases across 16 suites.

### Credentials

| Username | Password | Role |
|----------|----------|------|
| `sysadmin` | `Sysadmin@2026!` | system_admin |
| `admin` | `AdminPass@2026!` | admin |
| `mapper.finance` | `Provisum@2026!` | mapper (Finance) |
| `mapper.maintenance` | `Provisum@2026!` | mapper (Maintenance) |
| `mapper.procurement` | `Provisum@2026!` | mapper (Procurement) |
| `approver.finance` | `Provisum@2026!` | approver (Finance) |
| `approver.operations` | `Provisum@2026!` | approver (Operations) |
| `viewer` | `Provisum@2026!` | viewer |
| `security.lead` | `Security@2026!` | mapper (all depts) |
| `compliance.officer` | `Compliance@2026!` | approver (all depts) |
| `grc.analyst` | `GrcAnalyst@2026!` | viewer (all depts) |

### Rules

1. Read `docs/testing/E2E_TEST_SCRIPTS.md` before starting
2. Execute each test case exactly as described
3. Record PASS, FAIL, or SKIPPED for each
4. Take screenshots of key screens
5. Log out between persona switches
6. SKIP tests 12.4-12.6 (AI pipeline — costs API credits) unless told otherwise
7. Run Suite 16 (demo env switching) LAST — it reseeds the database
8. If a test fails, note the test ID, expected vs actual, and screenshot — do not try to fix

### Output

After all tests, provide:

```
# Provisum E2E Test Report — [Date]

## Summary
- Total: 142 tests
- Passed: X
- Failed: Y
- Skipped: Z

## Failures
| Test ID | Test Name | Expected | Actual | Screenshot |
|---------|-----------|----------|--------|------------|

## Observations
- [UX issues, slow pages, visual glitches]
```

Begin with Suite 1, Test 1.1 — navigate to the landing page.
