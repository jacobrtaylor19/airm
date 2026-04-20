# 10 — Cross-Persona Workflows (Integration)

**Tester:** _________________  **Date:** _________________
**Time budget:** 45 min

These are the scripts that matter most for demo credibility: end-to-end flows that pass work across personas, the way a real migration would. If these pass, the app's core thesis holds.

**Setup:** reset demo data before starting (sysadmin → Reset Demo Data). Otherwise old state can poison the results.

---

## Flow 1 — Full mapping → approval → export cycle (30 min)

### CROSS-01: Admin kicks off the pipeline
- [ ] Log in as `demo.admin`
- [ ] Navigate to admin pipeline controls
- [ ] Run "Generate Personas" (if not already run)
- [ ] Wait for completion (watch status)
- [ ] **Expected:** Job succeeds; personas appear on `/personas`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-02: Admin runs Auto-Map
- [ ] Run "Auto-Map Roles"
- [ ] **Expected:** Job succeeds; persona-to-target-role mappings appear

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-03: Admin runs SOD analysis
- [ ] Run SOD Analysis
- [ ] **Expected:** Job succeeds; SOD conflicts appear on `/sod`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-04: Sign out → log in as demo.mapper.finance
- [ ] Switch users

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-05: Mapper reviews refinements
- [ ] Navigate to `/mapping` → Refinements tab
- [ ] Pick 3 low-confidence assignments
- [ ] For each, open detail, review, accept or override with AI Suggest
- [ ] **Expected:** Changes saved; confidence scores update appropriately

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-06: Mapper submits for review
- [ ] Select those 3 assignments + any other drafts
- [ ] Click Submit Selected
- [ ] **Expected:** Status → `pending_review`; SOD re-runs for the affected users; eventually transitions to `compliance_approved` (clean) or `sod_rejected`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-07: Sign out → log in as demo.approver
- [ ] Switch users

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-08: Approver sees the submitted assignments
- [ ] Navigate to `/approvals`
- [ ] **Expected:** The users you just submitted as mapper appear in the queue (compliance_approved ones)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-09: Approver approves some, rejects one
- [ ] Approve 2 users' assignments via Approve All
- [ ] Reject 1 assignment with a comment like "Scope too broad — reduce to AP-only roles"

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-10: Sign out → back to demo.mapper.finance
- [ ] **Expected:** Re-mapping tab now visible on `/mapping` (shows the rejected assignment)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-11: Mapper sees the rejection comment
- [ ] Click Re-mapping tab
- [ ] Open the sent-back assignment
- [ ] **Expected:** Approver's comment visible; assignment status `remap_required`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-12: Mapper remaps and resubmits
- [ ] Edit the mapping (swap target role)
- [ ] Submit for review
- [ ] **Expected:** Status moves back to `pending_review`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-13: Approver approves the remap
- [ ] Sign out → demo.approver
- [ ] Approve the remapped assignment
- [ ] **Expected:** Status → `approved`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-14: Admin exports approved data
- [ ] Sign out → demo.admin
- [ ] Navigate to Exports module
- [ ] Generate provisioning Excel export
- [ ] **Expected:** XLSX contains the approved assignments you just walked through

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Flow 2 — SOD triage workflow (compliance → security) (15 min)

### CROSS-15: Log in as demo.compliance
- [ ] Switch users

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-16: Compliance reviews open SOD conflict
- [ ] Navigate to `/sod`
- [ ] Pick a critical within-role conflict
- [ ] Click "Route to Security" (or equivalent — creates a security_work_item)
- [ ] **Expected:** Work item created; security architect notified

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-17: Log in as demo.security
- [ ] Switch users
- [ ] Navigate to `/workspace/security`
- [ ] **Expected:** The routed work item appears in your queue

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-18: Security architect completes the redesign
- [ ] Open the work item
- [ ] Mark complete with resolution notes
- [ ] **Expected:** Work item moves to completed; compliance officer receives notification of completion

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-19: Back to compliance — verify closure
- [ ] Sign out → demo.compliance
- [ ] Navigate to `/workspace/compliance`
- [ ] **Expected:** The work item now shows as completed

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Flow 3 — Coordinator reminder cycle (10 min)

### CROSS-20: Log in as demo.coordinator
- [ ] Switch users

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-21: Check release readiness
- [ ] Navigate to `/releases`
- [ ] Pick a release; expand readiness checklist
- [ ] **Expected:** Shows current state of each check

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-22: Send deadline reminder
- [ ] Navigate to `/notifications` → Send Notification
- [ ] Target: mapper role; template: deadline reminder
- [ ] Send
- [ ] **Expected:** Notifications sent; appear in mappers' inboxes

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-23: Mapper sees the reminder
- [ ] Sign out → demo.mapper.finance
- [ ] Check notification bell badge — should show unread
- [ ] Navigate to `/notifications`
- [ ] **Expected:** The coordinator's reminder is in the inbox

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Flow 4 — Gap analysis confirm + remap (10 min)

### CROSS-24: Log in as demo.mapper.finance
- [ ] **Expected:** Already logged in from previous flow, or switch again

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-25: Gap analysis workbench
- [ ] Navigate to `/mapping` → Gap Analysis
- [ ] **Expected:** User-level table with Coverage %, Change Impact

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-26: Confirm a user's gap as-is
- [ ] Pick a user with Medium impact, click Confirm
- [ ] **Expected:** User moves to Confirmed section; snapshot saved for future Cursus integration

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-27: Bulk confirm
- [ ] Select 3 low-impact users, click Bulk Confirm
- [ ] **Expected:** All 3 confirmed in a single action

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-28: Remap a high-impact user
- [ ] Pick a user with High impact, click Remap
- [ ] **Expected:** Navigates to User Role Assignments tab with that user pre-selected

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Flow 5 — Lumen cross-persona awareness (10 min)

### CROSS-29: Ask Lumen as mapper
- [ ] As demo.mapper.finance, open Lumen
- [ ] Ask: "What do I need to do today?"
- [ ] **Expected:** Response references Finance-scoped pending work; may list drafts or refinements

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-30: Ask Lumen as approver
- [ ] Switch to demo.approver, open Lumen
- [ ] Ask: "What's in my queue?"
- [ ] **Expected:** Response references pending approvals

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### CROSS-31: Lumen tool call — write action
- [ ] As demo.admin, ask Lumen: "Send a reminder to all mappers with overdue work"
- [ ] **Expected:** Lumen calls the `send_reminder` tool; notifications dispatch; tool-call status visible in chat

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |

**Overall integration flow result:** ⬜ All green  ⬜ Some failures  ⬜ Blocker hit

**Demo credibility verdict:** Could you demo this end-to-end to a prospect without embarrassing pauses?

⬜ Yes — smooth, demoable
⬜ Minor hiccups — demo-able but needs practice on rough spots
⬜ No — too many rough edges for a live demo today
