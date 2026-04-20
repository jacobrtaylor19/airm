# 04 — Viewer Persona

**Account:** `demo.viewer` / `DemoGuide2026!`
**Role:** `viewer` (level 20) — read-only everywhere
**Tester:** _________________  **Date:** _________________
**Time budget:** 15 min

The viewer is the simplest persona. They should be able to see everything in their scope but never mutate anything. No buttons that write data should be clickable.

---

## A. Login & read-only audit

### VIEW-01: Login
- [ ] Log in as `demo.viewer`
- [ ] **Expected:** `/home`; role label "Viewer"

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-02: Dashboard renders
- [ ] Navigate to `/dashboard`
- [ ] **Expected:** KPIs + strapline load; no action buttons (no Submit, no Run Analysis, no Edit)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## B. All key pages render but are read-only

For each page below, confirm:
1. The page loads without error
2. No mutation buttons are present (or are disabled)

### VIEW-03: Personas
- [ ] `/personas` loads
- [ ] **Expected:** No Add Persona button; no Delete; detail panel shows data but no Save

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-04: Mapping
- [ ] `/mapping` loads
- [ ] **Expected:** No Submit buttons, no Bulk Assign, no Save, no AI Suggest trigger on detail panels

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-05: SOD
- [ ] `/sod` loads
- [ ] **Expected:** Conflict list visible; no Accept Risk / Escalate / Resolve buttons

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-06: Approvals
- [ ] `/approvals` loads (or may redirect)
- [ ] **Expected:** If accessible, no Approve/Reject buttons — read-only view

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-07: Risk Analysis
- [ ] `/risk-analysis` loads
- [ ] **Expected:** Cards visible, drill-downs work (read-only)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-08: Releases
- [ ] `/releases` loads
- [ ] **Expected:** Release cards visible; no Create / Edit buttons

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## C. Blocked pages

### VIEW-09: Admin console
- [ ] Navigate to `/admin`
- [ ] **Expected:** Redirect to `/unauthorized`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-10: Calibration
- [ ] Navigate to `/calibration`
- [ ] **Expected:** Viewer should be blocked per role matrix — redirect or 403

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-11: Upload
- [ ] Navigate to `/data/upload`
- [ ] **Expected:** Blocked OR page loads but upload button disabled

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## D. Allowed read-only features

### VIEW-12: Knowledge Base
- [ ] Navigate to `/help`
- [ ] **Expected:** Loads; viewer sees Core Concepts only (no Workflow, Admin, or role-specific articles)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-13: Article feedback still works
- [ ] Open any visible article
- [ ] Click thumbs up or thumbs down
- [ ] **Expected:** Feedback accepts, "Thanks" message shown — this is client-side only, fine for viewer

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-14: Lumen read-only
- [ ] Open Lumen widget
- [ ] Ask a question about SOD conflicts
- [ ] **Expected:** Gets an answer; any write actions Lumen could theoretically take should be disabled or refused

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-15: Notifications
- [ ] Navigate to `/notifications`
- [ ] **Expected:** Inbox loads; no Send Notification button

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### VIEW-16: Support
- [ ] Navigate to `/support`
- [ ] **Expected:** Form loads (viewer can submit a support ticket — that's a read-level action on the product, not a mutation on migration data)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## E. Direct API attempt (security test)

### VIEW-17: API mutation attempt
- [ ] Open browser devtools → console
- [ ] Run:
  ```js
  fetch('/api/personas/create', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name:'HACK', businessFunction:'test'}) }).then(r => r.status)
  ```
- [ ] **Expected:** 403 Forbidden (or 401)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |

**Overall viewer persona result:** ⬜ All green  ⬜ Some failures  ⬜ Blocker hit

**Read-only enforcement verdict:** ⬜ Clean — no mutations possible  ⬜ Leak detected (log in issues above)
