# 03 — Approver Persona

**Account:** `demo.approver` / `DemoGuide2026!`
**Role:** `approver` (level 60) — all data; can approve/reject/send back; cannot edit assignments
**Tester:** _________________  **Date:** _________________
**Time budget:** 30 min

The approver's world is `/approvals`. They also need to review SOD conflicts and make accept-with-control decisions.

---

## A. Login & orientation

### APPR-01: Login + home
- [ ] Log in as `demo.approver`
- [ ] **Expected:** `/home`; role label "Approver"; tiles include Approvals prominently

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-02: Dashboard
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** Strapline calls out approval queue count if there are pending items

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## B. Approval queue

### APPR-03: Queue structure
- [ ] Navigate to `/approvals`
- [ ] **Expected:** Queue grouped by user (one row per user with >=1 pending), worst-status first, Approved section collapsible at bottom

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-04: Expand a user row
- [ ] Click a user row to expand
- [ ] **Expected:** Shows all assignments for that user: persona → target role, confidence score, SOD conflicts (if any), mapper notes, change impact

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-05: Approve one assignment
- [ ] Click Approve on one assignment
- [ ] **Expected:** Status → approved; toast confirms; audit log implied

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-06: Approve All per user
- [ ] Find a user with multiple pending, click Approve All
- [ ] **Expected:** All assignments for that user approved in one action

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-07: Reject with feedback
- [ ] Pick an assignment, click Reject
- [ ] Enter a comment like "Replace AP_VENDOR_EDIT with AP_VENDOR_READ per SOX control AP-03"
- [ ] **Expected:** Status → `remap_required`; comment saved; will appear in mapper's Re-mapping queue

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-08: Approved section
- [ ] Scroll to bottom / click to expand Approved section
- [ ] **Expected:** Users whose assignments are all approved appear here (moved out of active queue)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-09: Approve All for Department (if scoped by filter)
- [ ] Apply department filter
- [ ] Look for "Approve All for Department" button
- [ ] **Expected:** Present and functional (skip actually clicking unless comfortable)

**Result:** ⬜ Pass  ⬜ Fail  ⬜ Skipped (risky)
**Notes:**

---

## C. SOD review (approver sees all)

### APPR-10: Full SOD visibility
- [ ] Navigate to `/sod`
- [ ] **Expected:** Sees both between_role AND within_role conflicts (unlike mappers)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-11: Accept risk with mitigating control
- [ ] Pick an open SOD conflict
- [ ] Click Accept Risk
- [ ] Fill in mitigating control fields: description, owner, frequency
- [ ] **Expected:** Conflict marked accepted; "Controlled" badge appears

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-12: Review existing access
- [ ] On `/sod`, look for conflicts with blue "Existing Access" badge
- [ ] **Expected:** These are conflicts carried forward from source system (not net-new)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## D. Read-only on mapping data

### APPR-13: Mapping page — no edit actions
- [ ] Navigate to `/mapping`
- [ ] **Expected:** Page loads but no Submit/Edit/Delete/Add buttons visible (approvers view, don't mutate)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## E. Risk Analysis

### APPR-14: Risk dashboard accessible
- [ ] Navigate to `/risk-analysis`
- [ ] **Expected:** 4 risk cards visible, can drill down

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## F. Negative tests

### APPR-15: Cannot access admin console
- [ ] Navigate to `/admin`
- [ ] **Expected:** Redirect to `/unauthorized`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-16: Cannot run AI pipeline
- [ ] Try to find Run SOD Analysis / Generate Personas buttons
- [ ] **Expected:** NOT visible or disabled for approver

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## G. Knowledge Base

### APPR-17: Approver articles visible
- [ ] Navigate to `/help`
- [ ] **Expected:** Approver Workflow articles visible: `approval-queue`, `approving-and-rejecting`, `reviewing-sod-conflicts`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### APPR-18: Mapper-only articles hidden
- [ ] **Expected:** `mapping-queue`, `bulk-mapping` etc. NOT in the visible list

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## H. Notifications

### APPR-19: Approver receives notifications
- [ ] Navigate to `/notifications`
- [ ] **Expected:** Inbox loads; may contain "New assignments awaiting your review" type messages (if any mapper has submitted recently)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |

**Overall approver persona result:** ⬜ All green  ⬜ Some failures  ⬜ Blocker hit
