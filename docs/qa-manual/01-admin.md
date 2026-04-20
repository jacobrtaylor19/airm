# 01 — Admin Persona

**Account:** `demo.admin` / `DemoGuide2026!`
**Role:** `admin` (level 80) — full data access, can run pipeline, approve, bulk delete
**Tester:** _________________  **Date:** _________________
**Time budget:** 45 min

The admin is the power user. They touch every module. This script is the most comprehensive single-persona test.

> **Before starting:** If data looks stale, reset demo first (sysadmin → Admin Console → Reset Demo Data).

---

## A. Login & orientation

### ADMIN-01: Login + home
- [ ] Navigate to `demo.provisum.io/login`
- [ ] Click `demo.admin` pill, click Sign In
- [ ] **Expected:** Redirect to `/home`; 9 module tiles visible (Role Mapping, Approvals, Risk, Releases, Data, Admin, Workspace, Learn, Exports — or similar)
- [ ] If welcome tour appears, click "Skip Tour"

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-02: Dashboard strapline + KPIs
- [ ] Click "Role Mapping" tile (or navigate to `/dashboard`)
- [ ] **Expected:** Strapline banner with prescriptive message; KPI cards show numbers for Users, Personas, Mappings, SOD conflicts; Provisioning Alerts card visible

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-03: Sidebar navigation
- [ ] Click through each sidebar item in the current module
- [ ] **Expected:** All links route correctly, no 404s, active state highlights correctly

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## B. Upload module

### ADMIN-04: Upload page loads
- [ ] Navigate to `/data/upload` (or via sidebar "Upload")
- [ ] **Expected:** Tabs for Source Users, Source Roles, Target Roles, SOD Rules, etc.

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-05: Template download
- [ ] Click "Download Template" on any upload tab
- [ ] **Expected:** CSV downloads with correct headers

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## C. Personas

### ADMIN-06: Persona list
- [ ] Navigate to `/personas`
- [ ] **Expected:** ~20 personas visible with user counts, confidence, status

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-07: Persona detail
- [ ] Click any persona
- [ ] **Expected:** Detail view shows members, source permissions, target role mappings, AI reasoning

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-08: Add persona (admin-only action)
- [ ] On `/personas`, click "Add Persona"
- [ ] Fill name + business function + source, save
- [ ] **Expected:** New persona appears in list, empty members

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## D. Mapping workspace

### ADMIN-09: Mapping tabs
- [ ] Navigate to `/mapping`
- [ ] Click each tab: Personas / User Role Assignments / Refinements / Re-mapping (if present) / Gap Analysis
- [ ] **Expected:** All tabs load without error

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-10: Bulk assign
- [ ] On Personas tab, select 2 personas via checkbox
- [ ] Click "Bulk Assign"
- [ ] Pick a target role, confirm
- [ ] **Expected:** Both personas now have the target role, success toast

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-11: Refinements + AI Suggest
- [ ] Click Refinements tab
- [ ] Pick a low-confidence assignment, open detail
- [ ] Click "AI Suggest"
- [ ] **Expected:** Modal shows ranked suggestions with reasoning; can accept or override

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-12: Gap analysis tab
- [ ] Click Gap Analysis tab
- [ ] **Expected:** User-level table with Coverage %, Change Impact badges (High/Medium/Low/None), Confirm + Remap buttons per row

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-13: Submit for review
- [ ] Pick a `draft` assignment, click Submit (or select multiple and Submit Selected)
- [ ] **Expected:** Status changes to `pending_review`; success toast; assignment disappears from draft filter

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-14: Run AI pipeline (careful — mutates data)
- [ ] Navigate to `/admin` → pipeline section (or dashboard action)
- [ ] Click "Run SOD Analysis"
- [ ] **Expected:** Job starts, status polls, eventually marked succeeded; SOD count updates

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## E. SOD

### ADMIN-15: SOD page loads
- [ ] Navigate to `/sod`
- [ ] **Expected:** Summary cards, heatmap (department × severity), conflict list, filters (severity, status, type, search)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-16: SOD filtering
- [ ] Apply severity filter (Critical only)
- [ ] Apply status filter (Open only)
- [ ] Search for a user's name
- [ ] **Expected:** List narrows correctly, count updates

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-17: Role Integrity tab
- [ ] Click Role Integrity tab
- [ ] **Expected:** Within-role SOD violations listed (admin can see all)

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-18: Contextual help (`?` link)
- [ ] On `/sod`, locate the `?` icon near the Run SOD Analysis button
- [ ] Click it
- [ ] **Expected:** Opens `/help/sod-conflict-resolution` in new tab

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## F. Approvals

### ADMIN-19: Approval queue
- [ ] Navigate to `/approvals`
- [ ] **Expected:** Queue grouped by user (not by assignment), expandable rows, status badges

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-20: Approve a single assignment
- [ ] Expand any user row
- [ ] Click Approve on one assignment
- [ ] **Expected:** Status changes, toast shown, audit event implied

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-21: Approve All per user
- [ ] Find a user with multiple pending assignments
- [ ] Click "Approve All" on that user row
- [ ] **Expected:** All pending → approved; user moves to Approved section

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-22: Send back to draft
- [ ] Pick an assignment, click the "Send Back" action
- [ ] Provide a comment
- [ ] **Expected:** Status becomes `remap_required`; appears in mapper's Re-mapping queue

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## G. Risk Analysis

### ADMIN-23: Risk dashboard
- [ ] Navigate to `/risk-analysis`
- [ ] **Expected:** 4 cards: Over-provisioning, Permission Changes, SOD Density, Role Integrity

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-24: Permission Changes drill-down
- [ ] Click the Permission Changes card
- [ ] **Expected:** Modal with tabs All / Gaining / Reduced; per-user detail

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## H. Calibration

### ADMIN-25: Calibration queue
- [ ] Navigate to `/calibration`
- [ ] **Expected:** List of low-confidence assignments, threshold slider, confidence distribution chart below
- [ ] Locate the `?` icon next to the subtitle — should link to `/help/ai-confidence-scores`

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-26: Bulk accept
- [ ] Select multiple assignments, click Accept All
- [ ] **Expected:** All accepted, list refreshes

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## I. Releases

### ADMIN-27: Release list
- [ ] Navigate to `/releases`
- [ ] **Expected:** Release cards with readiness checklist (8-point), cutover/go-live dates, status badges

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-28: Edit a release
- [ ] Click a release name to open edit dialog
- [ ] Change a deadline, save
- [ ] **Expected:** Saved, dates update on the card

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-29: Release comparison
- [ ] Navigate to `/releases/compare`
- [ ] Pick two releases
- [ ] **Expected:** Side-by-side comparison loads

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## J. Exports

### ADMIN-30: Excel export
- [ ] Navigate to Exports page
- [ ] Trigger the provisioning Excel export
- [ ] **Expected:** XLSX downloads, opens cleanly with multiple tabs

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-31: PPTX status slide
- [ ] Trigger PPTX export
- [ ] **Expected:** PPTX downloads, opens in Keynote/PowerPoint, has cover sheet + exec summary

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## K. Knowledge Base

### ADMIN-32: /help loads
- [ ] Navigate to `/help`
- [ ] **Expected:** 28 articles visible, all 7 categories shown, admin sees all categories including Admin Reference

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-33: Article page + feedback
- [ ] Open any article
- [ ] Scroll to bottom — should see "Was this helpful?" with thumbs up/down
- [ ] Click thumbs up
- [ ] **Expected:** Replaces with "Thanks for your feedback." Persist across reload

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-34: Search
- [ ] On `/help`, search for "persona"
- [ ] **Expected:** Filter narrows to articles matching "persona"

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## L. Lumen AI

### ADMIN-35: Lumen chat widget
- [ ] On any page, click the floating teal chat widget (bottom right) or press Cmd+K
- [ ] **Expected:** Panel opens, prompt input focused
- [ ] Ask: "How many personas are there?"
- [ ] **Expected:** Streams response that cites actual numbers from the DB

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-36: Lumen tool call
- [ ] Ask: "Show me the top 3 SOD conflicts"
- [ ] **Expected:** Lumen calls a tool (may show tool-call indicator), returns structured answer

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-37: Lumen chat history
- [ ] Start a new conversation via the sidebar
- [ ] **Expected:** New thread appears; previous threads remain

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## M. Notifications

### ADMIN-38: Inbox
- [ ] Click the bell icon in header (or navigate to `/notifications`)
- [ ] **Expected:** Notification list; badge count matches unread

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

### ADMIN-39: Send notification
- [ ] Click "Send Notification"
- [ ] Pick a user (or role), choose a quick template, send
- [ ] **Expected:** Sent successfully, toast confirms

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## N. Support

### ADMIN-40: Support ticket form
- [ ] Navigate to `/support`
- [ ] **Expected:** Form pre-filled with your name/email; all fields visible

**Result:** ⬜ Pass  ⬜ Fail
**Notes:**

---

## Issues Found

| # | Step ID | Severity | One-line description |
|---|---------|----------|----------------------|
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |
|   |         |          |                      |

**Overall admin persona result:** ⬜ All green  ⬜ Some failures  ⬜ Blocker hit
