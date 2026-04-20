# 07 — Compliance Officer Persona

**Account:** `demo.compliance` / `DemoGuide2026!`
**Role:** `compliance_officer` (level 55) — SOD triage, accept-risk workflow, compliance workspace
**Tester:** _________________  **Date:** _________________
**Time budget:** 30 min

The compliance officer owns SOD policy and the accept-with-mitigating-control decision. They have a dedicated workspace at `/workspace/compliance`.

---

## A. Login & orientation

### COMP-01: Login
- [ ] Log in as `demo.compliance`
- [ ] **Expected:** `/home`; role label "Compliance Officer"

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COMP-02: Compliance workspace tile
- [ ] **Expected:** A "Compliance Workspace" module tile is visible on the home launcher

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## B. Compliance workspace

### COMP-03: /workspace/compliance loads
- [ ] Navigate to `/workspace/compliance`
- [ ] **Expected:** Dedicated workspace showing security work items, triage queue, escalations

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COMP-04: Work items
- [ ] **Expected:** Open + completed work items listed; can filter

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COMP-05: Route to security
- [ ] Pick a work item
- [ ] Use "Route to Security" action (if present) — sends to security_architect
- [ ] **Expected:** Work item assigned; notification sent

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## C. SOD (full visibility including within-role)

### COMP-06: SOD with within-role
- [ ] Navigate to `/sod`
- [ ] **Expected:** Both between_role AND within_role conflicts visible; Role Integrity tab present

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COMP-07: Accept risk with mitigating control
- [ ] Pick an open conflict
- [ ] Click Accept Risk
- [ ] Fill control description, owner, frequency
- [ ] Submit
- [ ] **Expected:** Conflict marked as accepted with control; "Controlled" badge appears

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COMP-08: Escalate
- [ ] Pick another conflict, click Escalate (if present)
- [ ] Provide reason
- [ ] **Expected:** Escalation recorded; routed appropriately

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COMP-09: SOD rule editor
- [ ] Look for access to SOD rulebook CRUD (compliance-specific)
- [ ] **Expected:** Can view, create, edit, disable SOD rules

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## D. Audit evidence + exports

### COMP-10: Audit evidence package
- [ ] Navigate to `/admin/evidence-package` (or via compliance nav)
- [ ] **Expected:** Loads with generation form; 6-tab SOX/SOC 2 package
- [ ] Generate a package
- [ ] **Expected:** Excel downloads with 6 tabs

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COMP-11: Security design export
- [ ] Trigger Security Design export (3-tab Excel)
- [ ] **Expected:** XLSX with Role Catalog, Permission Matrix, SOD Summary

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## E. Risk analysis

### COMP-12: Risk dashboard
- [ ] Navigate to `/risk-analysis`
- [ ] **Expected:** All 4 cards including Role Integrity; compliance officer should have elevated SOD visibility

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## F. Negative tests

### COMP-13: Cannot run AI pipeline
- [ ] **Expected:** Pipeline run actions NOT available to compliance

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COMP-14: Cannot edit mappings
- [ ] Navigate to `/mapping`
- [ ] **Expected:** Can view (for triage context); Submit/Edit NOT visible

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### COMP-15: Cannot access full admin console
- [ ] Navigate to `/admin`
- [ ] **Expected:** Either blocked or restricted to compliance-relevant sections only

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## G. Knowledge Base

### COMP-16: Relevant articles
- [ ] Navigate to `/help`
- [ ] **Expected:** `compliance-workspace`, `reviewing-sod-conflicts`, `sod-conflict-resolution` visible (admin role grants access; role-specific gating varies)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## H. Notifications

### COMP-17: Inbox
- [ ] Navigate to `/notifications`
- [ ] **Expected:** May receive route-to-security notifications, escalations

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |

**Overall compliance officer persona result:** ⬜ All green  ⬜ Some failures  ⬜ Blocker hit
