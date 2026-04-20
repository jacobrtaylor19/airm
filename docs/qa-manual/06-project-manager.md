# 06 — Project Manager Persona

**Account:** `demo.pm` / `DemoGuide2026!`
**Role:** `project_manager` (level 70) — all data; PM-level oversight
**Tester:** _________________  **Date:** _________________
**Time budget:** 20 min

The PM sits above coordinator and has full cross-scope visibility. They don't typically mutate migration data; they monitor progress and run the status reporting cycle.

---

## A. Login & orientation

### PM-01: Login
- [ ] Log in as `demo.pm`
- [ ] **Expected:** `/home`; role label "Project Manager"

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### PM-02: Dashboard — full scope
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** KPIs show **all-department** totals (not scoped to one org unit)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## B. Migration intelligence

### PM-03: Release comparison
- [ ] Navigate to `/releases/compare` (or via sidebar)
- [ ] Pick two releases side-by-side
- [ ] **Expected:** Comparison view renders; metrics shown for each

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### PM-04: Release timeline
- [ ] Navigate to `/releases/timeline`
- [ ] **Expected:** Gantt view of all releases in the program

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### PM-05: Readiness checklist
- [ ] Open a release, expand readiness
- [ ] **Expected:** 8-point check visible

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## C. Risk reporting

### PM-06: Risk dashboard
- [ ] Navigate to `/risk-analysis`
- [ ] **Expected:** 4 risk cards, drill-down works

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## D. Status reporting exports

### PM-07: Status slide PPTX
- [ ] Navigate to Exports module
- [ ] Trigger Status Slide export
- [ ] **Expected:** PPTX downloads with cover sheet, exec summary, release timeline

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### PM-08: Excel export
- [ ] Trigger provisioning Excel export
- [ ] **Expected:** XLSX with multiple tabs

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## E. Can PM approve?

### PM-09: Approvals page
- [ ] Navigate to `/approvals`
- [ ] **Expected:** Can view. PM's approve permissions depend on your role matrix — check: if Approve buttons are visible, that's OK per the hierarchy (70 > approver 60). If not visible, that's also OK (approval is a separate function). Just document what you see.

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## F. Migration Health dashboard (shared with admin)

### PM-10: Migration health access
- [ ] Try to navigate to `/admin/migration-health`
- [ ] **Expected:** Either accessible (PM is a high-level monitoring role) or redirects. Document what happens.

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## G. Negative tests

### PM-11: Cannot edit assignments
- [ ] Navigate to `/mapping`
- [ ] **Expected:** Can view. Edit/Submit/Bulk Assign buttons should NOT be present for PM (they oversee, not execute)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### PM-12: Cannot run AI pipeline
- [ ] **Expected:** Run Pipeline buttons NOT visible (pipeline is admin/mapper)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### PM-13: Admin console blocked
- [ ] Navigate to `/admin`
- [ ] **Expected:** Redirect to `/unauthorized` (PM is not system_admin)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## H. Notifications

### PM-14: Inbox
- [ ] Navigate to `/notifications`
- [ ] **Expected:** Loads; may show release milestone notifications

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |

**Overall PM persona result:** ⬜ All green  ⬜ Some failures  ⬜ Blocker hit

**PM role boundary question (for me to resolve):** Are Approve buttons visible or hidden for PM? Record what you observed in PM-09.
