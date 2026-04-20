# 08 — Security Architect Persona

**Account:** `demo.security` / `DemoGuide2026!`
**Role:** `security_architect` (level 58) — target role lifecycle, security workspace, redesign work
**Tester:** _________________  **Date:** _________________
**Time budget:** 30 min

The security architect owns the target role catalog: approves new roles, handles redesign requests, and owns the `/workspace/security` view.

---

## A. Login & orientation

### SEC-01: Login
- [ ] Log in as `demo.security`
- [ ] **Expected:** `/home`; role label "Security Architect"

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SEC-02: Security workspace tile
- [ ] **Expected:** A "Security Workspace" module tile on home launcher

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## B. Security workspace

### SEC-03: /workspace/security loads
- [ ] Navigate to `/workspace/security`
- [ ] **Expected:** Workspace shows work items routed from compliance_officer, redesign queue

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SEC-04: Complete a work item
- [ ] Pick an assigned work item
- [ ] Fill in resolution notes, mark complete
- [ ] **Expected:** Work item moves to Completed; originating compliance officer notified

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## C. Target role lifecycle (security architect's core responsibility)

### SEC-05: Target roles list
- [ ] Navigate to `/target-roles` (or via Security Workspace)
- [ ] **Expected:** List of target roles with status (draft/active/archived), approval info

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SEC-06: Approve a draft role
- [ ] Find a role with status `draft`
- [ ] Click Approve (security_architect can do this)
- [ ] **Expected:** Status → `active`; approved_by and approved_at fields set; now available to mappers

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SEC-07: Edit a role
- [ ] Open a role detail; click Edit
- [ ] Change description or permissions
- [ ] Save
- [ ] **Expected:** Saved; mappers with active assignments for this role receive a notification

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SEC-08: Archive a role
- [ ] Pick an inactive role, archive it
- [ ] **Expected:** Status → `archived`; no longer in mapper role selector

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## D. Security design integration (target system adapter)

### SEC-09: Security design page
- [ ] Navigate to `/admin/security-design`
- [ ] **Expected:** Admin-level page with target system connection config, pull button, diff review

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SEC-10: Test connection (mock SAP adapter)
- [ ] Click Test Connection
- [ ] **Expected:** Success response for mock adapter (returns 9 SAP roles)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SEC-11: Pull changes
- [ ] Click Pull
- [ ] **Expected:** Diff view shows added/removed/modified roles
- [ ] Accept/dismiss individual changes
- [ ] **Expected:** Accepted changes apply to target role catalog

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## E. SOD visibility

### SEC-12: Full SOD visibility
- [ ] Navigate to `/sod`
- [ ] **Expected:** Both between_role AND within_role conflicts visible; Role Integrity tab present

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SEC-13: Role Integrity tab
- [ ] Click Role Integrity tab
- [ ] **Expected:** Lists target roles with within-role SOD violations; security architect can initiate redesign

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## F. Security design export

### SEC-14: 3-sheet Excel export
- [ ] Trigger Security Design export
- [ ] **Expected:** XLSX with Role Catalog, Permission Matrix, SOD Summary tabs; teal-styled headers

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## G. Risk analysis

### SEC-15: Risk dashboard
- [ ] Navigate to `/risk-analysis`
- [ ] **Expected:** 4 risk cards; Role Integrity card is particularly relevant here

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## H. Negative tests

### SEC-16: Cannot run AI pipeline
- [ ] **Expected:** Pipeline run actions NOT available to security_architect

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### SEC-17: Cannot approve mappings
- [ ] Navigate to `/approvals`
- [ ] **Expected:** Either blocked OR no Approve/Reject buttons (approval is approver's job, not security architect's)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## I. Knowledge Base

### SEC-18: Relevant articles
- [ ] Navigate to `/help`
- [ ] **Expected:** Security-relevant articles visible

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## J. Notifications

### SEC-19: Receives route-to-security notifications
- [ ] **Expected:** Inbox may contain "redesign requested" items from compliance officers

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |

**Overall security architect persona result:** ⬜ All green  ⬜ Some failures  ⬜ Blocker hit
