# 05 — Coordinator Persona

**Account:** `demo.coordinator` / `DemoGuide2026!`
**Role:** `coordinator` (level 50) — scoped to assigned org unit; sends reminders, sets deadlines
**Tester:** _________________  **Date:** _________________
**Time budget:** 30 min

The coordinator runs day-to-day migration operations. They don't edit mappings or approve — they orchestrate, nudge, and keep the project on schedule.

---

## A. Login & orientation

### COORD-01: Login
- [ ] Log in as `demo.coordinator`
- [ ] **Expected:** `/home`; role label "Coordinator"

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COORD-02: Dashboard
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** Scoped to their assigned org unit; strapline + KPIs reflect scope

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## B. Release management

### COORD-03: Release list
- [ ] Navigate to `/releases`
- [ ] **Expected:** Cards with readiness checklist (8-point), deadline fields, status

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COORD-04: Edit deadlines on a release
- [ ] Click a release to open edit dialog
- [ ] Change Mapping Deadline, Review Deadline, or Approval Deadline
- [ ] Save
- [ ] **Expected:** Saved successfully; dates update on card

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COORD-05: Readiness checklist visible
- [ ] On a release card, expand the readiness section
- [ ] **Expected:** 8 checks listed: scope defined, assignments created, SOD resolved, approvals, deadlines, etc.; each shows pass/fail/warn

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COORD-06: Release timeline
- [ ] Navigate to `/releases/timeline` (or equivalent)
- [ ] **Expected:** Gantt-style view of releases in the program

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## C. Notifications (coordinator's primary tool)

### COORD-07: Notifications page
- [ ] Navigate to `/notifications`
- [ ] **Expected:** Inbox visible; "Send Notification" button present

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COORD-08: Compose + send notification
- [ ] Click Send Notification
- [ ] Pick recipients (a role, or specific users)
- [ ] Pick a quick template (e.g., "Deadline reminder")
- [ ] Send
- [ ] **Expected:** Sent successfully; appears in sent log (if available)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COORD-09: Send reminders (bulk)
- [ ] From dashboard or release page, find "Send Reminders" action
- [ ] Trigger it
- [ ] **Expected:** Dispatches notifications to users with overdue work; success toast

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## D. Read-only on migration data

### COORD-10: Personas page
- [ ] Navigate to `/personas`
- [ ] **Expected:** Can view, can add (mapper/coordinator can add); can delete (bulk delete available)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COORD-11: Mapping page
- [ ] Navigate to `/mapping`
- [ ] **Expected:** Can view. Coordinator-level actions may differ from mapper (check if Add Persona is still available)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COORD-12: SOD page
- [ ] Navigate to `/sod`
- [ ] **Expected:** Conflict list visible within scope

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COORD-13: Approvals
- [ ] Navigate to `/approvals`
- [ ] **Expected:** Either blocked, or loads but no Approve/Reject (coordinator doesn't approve)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## E. Migration health (coordinator's key dashboard)

### COORD-14: Risk Analysis
- [ ] Navigate to `/risk-analysis`
- [ ] **Expected:** Coordinator can see risk cards to spot work bottlenecks

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## F. Knowledge Base

### COORD-15: Coordinator articles visible
- [ ] Navigate to `/help`
- [ ] **Expected:** Coordinator Workflow articles present: `coordinator-overview`, `setting-due-dates`, `sending-notifications`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COORD-16: Mapper/Approver-only articles hidden
- [ ] **Expected:** `approval-queue`, `mapping-queue`, etc., NOT visible (they're role-gated to mapper/approver)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## G. Negative tests

### COORD-17: Cannot access admin console
- [ ] Navigate to `/admin`
- [ ] **Expected:** Redirect to `/unauthorized`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |

**Overall coordinator persona result:** ⬜ All green  ⬜ Some failures  ⬜ Blocker hit
