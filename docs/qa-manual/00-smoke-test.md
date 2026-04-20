# 00 — Smoke Test (All Personas)

**Tester:** _________________  **Date:** _________________  **Build/commit:** _________________
**Time budget:** 15 min

Run this first. It verifies the environment is alive and all 10 accounts can log in. If this fails, stop — there's a deployment issue and the other scripts won't be meaningful.

---

## Pre-flight

### SMOKE-01: Health check
- [ ] Open `https://demo.provisum.io/api/health` in a browser tab
- [ ] **Expected:** JSON response `{ "status": "ok", "components": { "database": "connected" } }`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-02: Home page loads
- [ ] Navigate to `https://demo.provisum.io/`
- [ ] **Expected:** Demo overview page loads with persona cards, Provisum branding, no console errors

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-03: Demo gate
- [ ] If not already gated: you should see a lead capture form
- [ ] If gated (30-day cookie): you skip directly to the persona pills
- [ ] **Expected:** Either path renders cleanly

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Login smoke — every account

For each account, click the pill (or type username), verify password auto-fills, click Sign In, confirm redirect to `/home`. Then Sign Out (sidebar → bottom avatar → Sign Out) before the next.

### SMOKE-04: demo.admin
- [ ] Log in as `demo.admin` / `DemoGuide2026!`
- [ ] **Expected:** Redirect to `/home`; see 9 module tiles; sidebar shows "Admin" role label
- [ ] Sign out

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-05: demo.mapper.finance
- [ ] Log in as `demo.mapper.finance` / `DemoGuide2026!`
- [ ] **Expected:** Redirect to `/home`; module tiles visible (fewer than admin); sidebar shows "Mapper"
- [ ] Sign out

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-06: demo.mapper.operations
- [ ] Log in as `demo.mapper.operations` / `DemoGuide2026!`
- [ ] **Expected:** Same as SMOKE-05
- [ ] Sign out

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-07: demo.approver
- [ ] Log in as `demo.approver` / `DemoGuide2026!`
- [ ] **Expected:** Redirect to `/home`; sidebar shows "Approver"
- [ ] Sign out

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-08: demo.viewer
- [ ] Log in as `demo.viewer` / `DemoGuide2026!`
- [ ] **Expected:** Redirect to `/home`; sidebar shows "Viewer"; no action buttons anywhere
- [ ] Sign out

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-09: demo.coordinator
- [ ] Log in as `demo.coordinator` / `DemoGuide2026!`
- [ ] **Expected:** Redirect to `/home`; sidebar shows "Coordinator"
- [ ] Sign out

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-10: demo.pm
- [ ] Log in as `demo.pm` / `DemoGuide2026!`
- [ ] **Expected:** Redirect to `/home`; sidebar shows "Project Manager"
- [ ] Sign out

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-11: demo.compliance
- [ ] Log in as `demo.compliance` / `DemoGuide2026!`
- [ ] **Expected:** Redirect to `/home`; sidebar shows "Compliance Officer"
- [ ] Sign out

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-12: demo.security
- [ ] Log in as `demo.security` / `DemoGuide2026!`
- [ ] **Expected:** Redirect to `/home`; sidebar shows "Security Architect"
- [ ] Sign out

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-13: sysadmin
- [ ] Log in as `sysadmin` / `Sysadmin@2026!`
- [ ] **Expected:** Redirect to `/home`; sidebar shows "System Admin"; Admin Console accessible
- [ ] Sign out

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-14: Invalid credentials
- [ ] Try to log in as `demo.admin` / `WrongPassword`
- [ ] **Expected:** Error message shown, stay on login page
- [ ] Try again with correct password — should work (lockout is 5 attempts)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Data sanity (as sysadmin)

### SMOKE-15: Dashboard loads with data
- [ ] Log in as sysadmin
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** Strapline banner visible; KPI cards show real numbers (users, personas, mappings, SOD); no 500 errors

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SMOKE-16: Key pages render
Visit each and confirm it loads (no 500/404, actual content visible):
- [ ] `/personas` — list of personas
- [ ] `/mapping` — mapping workspace (4 tabs)
- [ ] `/sod` — SOD conflicts
- [ ] `/approvals` — approval queue
- [ ] `/risk-analysis` — risk dashboard
- [ ] `/calibration` — calibration queue
- [ ] `/releases` — release list
- [ ] `/help` — knowledge base
- [ ] `/admin` — admin console

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Smoke verdict

If everything above passed, the environment is green and you can proceed to per-persona scripts.

If any **Blocker** or **High** failures: **stop testing, report back.** Other personas will likely fail for the same root cause.

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |

**Overall smoke result:** ⬜ All green  ⬜ Some failures (details above)
