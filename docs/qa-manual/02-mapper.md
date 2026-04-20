# 02 — Mapper Persona

**Accounts:** `demo.mapper.finance` / `DemoGuide2026!` AND `demo.mapper.operations` / `DemoGuide2026!`
**Role:** `mapper` (level 40) — scoped to assigned org unit; can run pipeline, edit, submit for review
**Tester:** _________________  **Date:** _________________
**Time budget:** 45 min (covers both mappers to verify org-unit scoping)

The mapper is the workhorse. They should only see data within their scope. This script verifies scope enforcement + core mapping workflow.

---

## A. Finance mapper

### MAPPER-01: Login as demo.mapper.finance
- [ ] Log in
- [ ] **Expected:** Redirect to `/home`; role label "Mapper"; fewer module tiles than admin (no Admin Console tile)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-02: Dashboard scoped to Finance
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** KPIs show Finance-only numbers; strapline mentions Finance context; **not** all-department totals

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-03: Users list scoping
- [ ] Navigate to `/users`
- [ ] **Expected:** Only Finance users visible (not Operations, HR, etc.)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-04: Personas list scoping
- [ ] Navigate to `/personas`
- [ ] **Expected:** Only personas with at least one Finance user visible; counts reflect Finance scope only

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## B. Mapping workflow (finance mapper)

### MAPPER-05: Mapping workspace
- [ ] Navigate to `/mapping`
- [ ] **Expected:** 4 tabs (Personas, User Role Assignments, Refinements, Gap Analysis). Re-mapping tab only if there are `remap_required` assignments

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-06: Edit an assignment
- [ ] Click any persona on the Personas tab
- [ ] **Expected:** Detail panel opens with source permissions, current target roles, role toggle UI
- [ ] Toggle a target role on/off, save
- [ ] **Expected:** Change persists, toast confirms

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-07: Add Persona (mapper can do this now)
- [ ] Click Add Persona on the Personas tab
- [ ] Fill in a name + business function, save
- [ ] **Expected:** Persona created successfully

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-08: AI Suggest
- [ ] Open any persona's detail panel
- [ ] Click AI Suggest
- [ ] **Expected:** Modal with ranked suggestions + reasoning + composite confidence

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-09: Submit for review
- [ ] Select multiple draft assignments via checkbox
- [ ] Click "Submit Selected"
- [ ] **Expected:** Status moves to `pending_review`; SOD analysis kicks off in background

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-10: Refinements tab
- [ ] Click Refinements tab
- [ ] **Expected:** Low-confidence / flagged assignments listed with status filter

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-11: Gap analysis as mapper
- [ ] Click Gap Analysis tab
- [ ] **Expected:** Only Finance users shown; Coverage %, Change Impact badges, Confirm/Remap actions
- [ ] Confirm one user with gaps as-is
- [ ] **Expected:** User moves to Confirmed section grouped by impact level

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-12: Remap from gap analysis
- [ ] On Gap Analysis, click Remap on a user
- [ ] **Expected:** Navigates to User Role Assignments tab with that user pre-selected

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## C. SOD (mapper scope)

### MAPPER-13: SOD page
- [ ] Navigate to `/sod`
- [ ] **Expected:** Only Finance-scoped conflicts visible; Role Integrity tab NOT visible (only security.lead mapper, admin, approver, compliance see it)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-14: Within-role conflicts hidden
- [ ] **Expected:** No "within_role" conflict type appears in the list (regular mappers only see between-role)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## D. Calibration

### MAPPER-15: Calibration access
- [ ] Navigate to `/calibration`
- [ ] **Expected:** Page loads with low-confidence assignments within Finance scope

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-16: Cannot access admin console
- [ ] Try to navigate to `/admin`
- [ ] **Expected:** Redirect to `/unauthorized` or 403

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## E. Negative tests — mapper cannot approve

### MAPPER-17: No approve buttons on /approvals
- [ ] Navigate to `/approvals` (may redirect away)
- [ ] **Expected:** Either blocked, OR page loads but no Approve/Reject buttons visible

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## F. Knowledge Base & support

### MAPPER-18: Mapper-specific help articles
- [ ] Navigate to `/help`
- [ ] **Expected:** Mapper Workflow articles visible: `mapping-queue`, `bulk-mapping`, `overriding-ai-suggestions`, `submitting-for-approval`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-19: Admin-only articles hidden
- [ ] Browse the KB
- [ ] **Expected:** `admin-onboarding-guide`, `uploading-target-roles`, `running-the-ai-pipeline`, `exporting-data` are NOT visible

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## G. Operations mapper (scope isolation check)

### MAPPER-20: Sign out + login as demo.mapper.operations
- [ ] Sign out of Finance mapper, log in as `demo.mapper.operations`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-21: Different users visible
- [ ] Navigate to `/users`
- [ ] **Expected:** Operations users only. No Finance users visible.
- [ ] Confirm: the user you saw first as Finance mapper is NOT visible now

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-22: Different personas visible
- [ ] Navigate to `/personas`
- [ ] **Expected:** Persona list differs from Finance mapper view

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-23: SOD conflicts scoped
- [ ] Navigate to `/sod`
- [ ] **Expected:** Operations-scope conflicts only; different set from Finance

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### MAPPER-24: Dashboard KPIs differ
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** KPI numbers differ from Finance mapper's numbers

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## H. Lumen AI (as mapper)

### MAPPER-25: Lumen is role-aware
- [ ] Open Lumen widget
- [ ] Ask: "How many users are in my scope?"
- [ ] **Expected:** Response cites a number that matches Operations scope (not the full 1,000)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |

**Overall mapper persona result:** ⬜ All green  ⬜ Some failures  ⬜ Blocker hit

**Scope enforcement verdict:** ⬜ Clean isolation between Finance and Operations  ⬜ Leak detected (log in issues above)
