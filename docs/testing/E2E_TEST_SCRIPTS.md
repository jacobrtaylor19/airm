# End-to-End Test Scripts — Provisum v0.6.0

**Target URL:** https://airm-npt8.onrender.com
**Total test cases:** 142
**Estimated time:** 2–3 hours

---

## Test Credentials

| Username | Password | Role | Scope |
|----------|----------|------|-------|
| `sysadmin` | `Sysadmin@2026!` | system_admin | Full access |
| `admin` | `AdminPass@2026!` | admin | Full access |
| `mapper.finance` | `Provisum@2026!` | mapper | Finance dept |
| `mapper.maintenance` | `Provisum@2026!` | mapper | Maintenance dept |
| `mapper.procurement` | `Provisum@2026!` | mapper | Procurement dept |
| `approver.finance` | `Provisum@2026!` | approver | Corporate Services |
| `approver.operations` | `Provisum@2026!` | approver | Operations |
| `viewer` | `Provisum@2026!` | viewer | Read-only |
| `security.lead` | `Security@2026!` | mapper | All depts |
| `compliance.officer` | `Compliance@2026!` | approver | All depts |
| `grc.analyst` | `GrcAnalyst@2026!` | viewer | All depts |

---

## SUITE 1: Public Pages & Landing (10 tests)

**No login required.**

### 1.1 Landing Page — Hero
1. Navigate to `/`
- **Expected:** Hero section with Provisum logo, title, subtitle, "Sign In" and "Learn More" buttons.

### 1.2 Landing Page — Nav Bar
1. Check the top navigation bar
- **Expected:** Provisum logo (left), "How It Works", "Overview", "Sign In" links (right).

### 1.3 Landing Page — Supported Platforms
1. Check below the hero CTA buttons
- **Expected:** "Supported platforms: SAP S/4HANA · Oracle Fusion · Workday · Salesforce · ServiceNow"

### 1.4 Landing Page — How It Works
1. Scroll below the hero
- **Expected:** 3-step section: "1. Upload Source Data" → "2. AI Maps Roles" → "3. Review & Export" with icons.

### 1.5 Landing Page — Feature Cards
1. Scroll further
- **Expected:** Three feature cards: "AI-Powered Analysis", "SOD Built In", "Audit-Ready" with descriptions.

### 1.6 Landing Page — Footer
1. Scroll to bottom
- **Expected:** Copyright line with current year.

### 1.7 Methodology Page
1. Click "How It Works" in nav or navigate to `/methodology`
- **Expected:** 6-step workflow page loads with nav bar at top.

### 1.8 Overview Page
1. Navigate to `/overview`
- **Expected:** Platform overview page loads with nav bar at top.

### 1.9 Health Endpoint
1. Navigate to `/api/health`
- **Expected:** JSON: `{ "status": "ok", "components": { "database": "connected" }, "timestamp": <number> }`

### 1.10 404 Page
1. Navigate to `/nonexistent-page`
- **Expected:** 404 page or redirect, not a blank screen or stack trace.

---

## SUITE 2: Authentication & Security (14 tests)

**Start unauthenticated.**

### 2.1 Login — Valid Credentials
1. Navigate to `/login`
2. Enter `sysadmin` / `Sysadmin@2026!`
3. Click Sign In
- **Expected:** Redirect to `/dashboard`. Sidebar shows all sections including ADMIN and SYSTEM.

### 2.2 Login — Invalid Password
1. Navigate to `/login`
2. Enter `sysadmin` / `wrongpassword`
3. Click Sign In
- **Expected:** Error message "Invalid credentials". No redirect.

### 2.3 Login — Demo Environment Switcher
1. On login page, click the Demo Environment dropdown
- **Expected:** 9 environments listed, all selectable (none greyed out): SAP S/4HANA (Default), Energy & Chemicals, Financial Services, Consumer Products, Manufacturing, Oracle Fusion, Workday, Salesforce, ServiceNow.

### 2.4 Login — Account Lockout
1. Enter `grc.analyst` with wrong password 5 times
- **Expected:** After 5th attempt: "Account locked due to too many failed attempts. Try again in 30 minutes."

### 2.5 Password Policy — Weak Password
1. Log in as `sysadmin`, go to Config Console → Users tab
2. Try creating a user with password `short`
- **Expected:** Error listing policy requirements (12 chars, uppercase, lowercase, digit, special).

### 2.6 Password Policy — Strong Password
1. Same as above with password `TestUser@2026!`
- **Expected:** User created successfully.

### 2.7 Session — Logout
1. Click logout (bottom of sidebar)
- **Expected:** Redirect to `/login`.

### 2.8 Session — Unauthenticated Access
1. Clear cookies, navigate to `/dashboard`
- **Expected:** Redirect to `/login`.

### 2.9 Security Headers
1. Open DevTools → Network, load any page
- **Expected:** Response headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`.

### 2.10 Rate Limiting — Login
1. In console: fire 6 rapid login attempts
- **Expected:** 6th returns 429 with `Retry-After` header.

### 2.11 Change Password
1. Log in as `sysadmin`, call `/api/auth/change-password` with current + new password
- **Expected:** Success response. Change password back after.

### 2.12 Input Validation — Malformed Request
1. In console: `fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({})}).then(r=>r.json()).then(console.log)`
- **Expected:** Status 400 with `{ error: "Validation failed", details: [...] }`.

### 2.13 API — Unauthorized Access
1. In console (no session): `fetch('/api/admin/settings').then(r=>r.json()).then(console.log)`
- **Expected:** `{ error: "Unauthorized" }` with status 403.

### 2.14 Error Sanitization
1. Trigger a server error intentionally
- **Expected:** Generic error message, no stack trace or internal details.

---

## SUITE 3: System Admin Workflow (18 tests)

**Persona: `sysadmin` / `Sysadmin@2026!`**

### 3.1 Dashboard — KPI Cards
1. Navigate to `/dashboard`
- **Expected:** KPI cards: Total Users (1,000), Personas (0 initially), Mappings, Approvals.

### 3.2 Dashboard — Department Grid
1. Scroll to department mapping status
- **Expected:** Grid shows departments with stage breakdown.

### 3.3 Dashboard — Strapline
1. Check the status banner at top
- **Expected:** System admin sees executive overview strapline.

### 3.4 Config Console — Settings
1. Navigate to `/admin` → Settings tab
- **Expected:** Project name, source system, target system fields visible.

### 3.5 Config Console — Update Setting
1. Change project name, click Save, refresh
- **Expected:** Setting persists.

### 3.6 Config Console — Users Tab
1. Click Users tab
- **Expected:** 11 app users listed with roles.

### 3.7 Config Console — Create User
1. Create new user with valid credentials
- **Expected:** User appears in list.

### 3.8 Config Console — Org Units
1. Click Org Units tab
- **Expected:** Hierarchical tree: Operations/Corporate Services/Technology with children.

### 3.9 Admin Users Page
1. Navigate to `/admin/users`
- **Expected:** Table with username, display name, role, org unit, active status.

### 3.10 Admin Assignments Page
1. Navigate to `/admin/assignments`
- **Expected:** Assignment management UI for mapper/approver to departments.

### 3.11 Audit Log
1. Navigate to `/audit-log`
- **Expected:** Recent actions visible with timestamps, actors, entities.

### 3.12 Data Upload Page
1. Navigate to `/upload`
- **Expected:** Upload interface, source system stats showing 1,000 users.

### 3.13 Source Roles Page
1. Navigate to `/source-roles`
- **Expected:** ~21 source roles. Expandable rows show permissions.

### 3.14 Target Roles Page
1. Navigate to `/target-roles`
- **Expected:** ~18 target roles. Expandable rows show permissions.

### 3.15 SOD Rules Page
1. Navigate to `/sod-rules`
- **Expected:** ~82 SOD rules with severity levels.

### 3.16 Releases Page
1. Navigate to `/releases`
- **Expected:** Wave 1 (in_progress) and Wave 2 (planning) visible.

### 3.17 Send Reminders Page
1. Navigate to `/notifications`
- **Expected:** Compose notification form, recipient selector.

### 3.18 Data Page
1. Navigate to `/data`
- **Expected:** Data management page loads.

---

## SUITE 4: Mapper — Finance (17 tests)

**Persona: `mapper.finance` / `Provisum@2026!`**

### 4.1 Login — Scoped Dashboard
1. Log in as `mapper.finance`
- **Expected:** Dashboard scoped to Finance department.

### 4.2 Sidebar — No Admin
1. Check sidebar
- **Expected:** No ADMIN or SYSTEM sections.

### 4.3 Users — Scoped
1. Navigate to `/users`
- **Expected:** Only Finance department users visible.

### 4.4 User Detail
1. Click on any user
- **Expected:** `/users/[userId]` page loads with user profile, persona assignment, role mappings.

### 4.5 Personas — Empty State
1. Navigate to `/personas`
- **Expected:** Empty state with "Generate Personas" button (no department confirmation section).

### 4.6 Personas — Business Function Filter
1. After personas exist: check filter dropdown next to search
- **Expected:** Dropdown shows business functions (Finance, Procurement, etc.) with counts.

### 4.7 Personas — Search
1. Type in search bar
- **Expected:** Real-time filtering of persona list.

### 4.8 Persona Detail
1. Click a persona to expand
- **Expected:** Description, user count, business function, permissions.

### 4.9 Mapping Page — Persona Mapping Tab
1. Navigate to `/mapping`
- **Expected:** Persona mapping workspace. Tab labels: "Persona Mapping", "Individual Refinements", "Gap Analysis" (no counts in tab labels).

### 4.10 Mapping — Bulk Assign
1. Select personas, choose target role, assign
- **Expected:** Assignment created. Toast confirmation.

### 4.11 Mapping — Individual Refinements Tab
1. Click Individual Refinements tab
- **Expected:** Shows users with assignments, override status.

### 4.12 Mapping — Gap Analysis Tab
1. Click Gap Analysis tab
- **Expected:** Shows coverage gaps if any.

### 4.13 SOD Analysis Page
1. Navigate to `/sod`
- **Expected:** SOD conflicts with severity badges.

### 4.14 SOD — Accept Risk
1. Find a medium/high conflict, submit risk acceptance with justification
- **Expected:** Status changes. Justification saved.

### 4.15 Approvals — Mapper View
1. Navigate to `/approvals`
- **Expected:** Queue visible. No approve/reject buttons for mapper.

### 4.16 Exports
1. Navigate to `/exports`, click Excel export
- **Expected:** File downloads.

### 4.17 Inbox
1. Navigate to `/inbox`
- **Expected:** Inbox loads. Notifications visible if any.

---

## SUITE 5: Mapper — Maintenance (5 tests)

**Persona: `mapper.maintenance` / `Provisum@2026!`**

### 5.1 Login — Scoped
1. Log in
- **Expected:** Dashboard scoped to Maintenance + Facilities.

### 5.2 Users — Different Scope
1. Navigate to `/users`
- **Expected:** Only Maintenance/Facilities users (different from Finance mapper).

### 5.3 Mapping — Scoped
1. Navigate to `/mapping`
- **Expected:** Only Maintenance/Facilities personas.

### 5.4 SOD — Scoped
1. Navigate to `/sod`
- **Expected:** Only Maintenance-related conflicts.

### 5.5 Data Isolation
1. Compare user count with Finance mapper
- **Expected:** Different counts — data is isolated by org unit.

---

## SUITE 6: Mapper — Procurement (3 tests)

**Persona: `mapper.procurement` / `Provisum@2026!`**

### 6.1 Login — Scoped
1. Log in
- **Expected:** Dashboard scoped to Procurement + Supply Chain + Warehouse.

### 6.2 Users — Scoped
1. Navigate to `/users`
- **Expected:** Procurement/Supply Chain/Warehouse users only.

### 6.3 Mapping — Scoped
1. Navigate to `/mapping`
- **Expected:** Only relevant personas.

---

## SUITE 7: Security Lead — All Depts (3 tests)

**Persona: `security.lead` / `Security@2026!`**

### 7.1 Login — Unscoped Mapper
1. Log in
- **Expected:** Dashboard shows global stats (no org unit restriction).

### 7.2 Users — All Visible
1. Navigate to `/users`
- **Expected:** All 1,000 users visible.

### 7.3 Mapping — All Personas
1. Navigate to `/mapping`
- **Expected:** All personas visible, can map any.

---

## SUITE 8: Approver — Finance (12 tests)

**Persona: `approver.finance` / `Provisum@2026!`**

### 8.1 Login — Approver Dashboard
1. Log in
- **Expected:** Dashboard with approver-focused strapline.

### 8.2 Approvals — Queue
1. Navigate to `/approvals`
- **Expected:** Approval queue with approve/reject buttons visible.

### 8.3 Approve a Mapping
1. Find a "ready_for_approval" assignment, click Approve
- **Expected:** Status changes to "approved". Toast confirmation.

### 8.4 Reject (Send Back)
1. Find assignment, click Send Back, enter reason
- **Expected:** Status changes to "sent_back". Reason saved.

### 8.5 Bulk Approve
1. Select multiple assignments, click Bulk Approve
- **Expected:** All selected approved.

### 8.6 SOD — Escalated Conflicts
1. Navigate to `/sod`
- **Expected:** Escalated conflicts visible if any.

### 8.7 SOD — Accept Risk as Approver
1. Accept a risk with justification
- **Expected:** Conflict resolved.

### 8.8 SOD — Remove Role and Resolve
1. Find a conflict, click "Remove Role" to resolve
- **Expected:** UI updates immediately (no manual refresh needed).

### 8.9 Users — Scoped
1. Navigate to `/users`
- **Expected:** Corporate Services scoped users.

### 8.10 Exports
1. Navigate to `/exports`, download PDF
- **Expected:** PDF downloads with scoped data.

### 8.11 Inbox
1. Navigate to `/inbox`
- **Expected:** Inbox loads.

### 8.12 Audit Log
1. Navigate to `/audit-log`
- **Expected:** Full audit trail visible (read-only).

---

## SUITE 9: Approver — Operations (3 tests)

**Persona: `approver.operations` / `Provisum@2026!`**

### 9.1 Login — Scoped
1. Log in
- **Expected:** Scoped to Operations (Maintenance, Facilities, Procurement, Supply Chain, Warehouse).

### 9.2 Approvals — Different Queue
1. Navigate to `/approvals`
- **Expected:** Different assignments than Finance approver.

### 9.3 SOD — Operations Conflicts
1. Navigate to `/sod`
- **Expected:** Operations-scoped conflicts.

---

## SUITE 10: Compliance Officer — All Depts (3 tests)

**Persona: `compliance.officer` / `Compliance@2026!`**

### 10.1 Login — Unscoped Approver
1. Log in
- **Expected:** Global stats, all data visible.

### 10.2 Approvals — All
1. Navigate to `/approvals`
- **Expected:** All approval queues visible, can approve any.

### 10.3 SOD — All Conflicts
1. Navigate to `/sod`
- **Expected:** All SOD conflicts across all departments.

---

## SUITE 11: Viewer — Read Only (8 tests)

**Persona: `viewer` / `Provisum@2026!` (or `grc.analyst` / `GrcAnalyst@2026!` if viewer is locked)**

### 11.1 Login
1. Log in
- **Expected:** Dashboard loads. No admin/system sections in sidebar.

### 11.2 Dashboard — Global View
1. Check dashboard
- **Expected:** Global stats (1,000 users), no org unit restriction.

### 11.3 Users — Read Only
1. Navigate to `/users`
- **Expected:** Full list. No edit/delete buttons.

### 11.4 Personas — Read Only
1. Navigate to `/personas`
- **Expected:** List visible. No generate/delete buttons.

### 11.5 Mapping — Read Only
1. Navigate to `/mapping`
- **Expected:** Data visible. No assign buttons.

### 11.6 SOD — Read Only
1. Navigate to `/sod`
- **Expected:** Conflicts visible. No accept-risk/escalate buttons.

### 11.7 Approvals — No Actions
1. Navigate to `/approvals`
- **Expected:** Queue visible. No approve/reject buttons.

### 11.8 Admin — Access Denied
1. Navigate to `/admin`
- **Expected:** Redirect to `/unauthorized` or access denied.

---

## SUITE 12: AI Pipeline (8 tests)

**Persona: `sysadmin` / `Sysadmin@2026!`**

### 12.1 Lumen Chatbot — Open
1. Press `Cmd+K` or click chat icon
- **Expected:** Lumen chatbot opens.

### 12.2 Lumen — Ask Question
1. Type "How many users are in the Finance department?"
- **Expected:** Streaming response with project-aware data.

### 12.3 Lumen — Role-Aware
1. Ask "What should I do next?"
- **Expected:** Response tailored to system_admin role.

### 12.4 Generate Personas (COSTS API CREDITS)
1. Navigate to `/personas`, click "Generate Personas"
- **Expected:** Job starts, progress shown, personas appear when complete.
- **NOTE:** SKIP if preserving API credits. Mark as SKIPPED.

### 12.5 Auto-Map Target Roles (COSTS API CREDITS)
1. Navigate to `/jobs`, start target role mapping
- **Expected:** Mappings created. Manual mappings NOT overwritten.
- **NOTE:** SKIP if preserving API credits. Mark as SKIPPED.

### 12.6 SOD Analysis Run (COSTS API CREDITS)
1. Start SOD analysis
- **Expected:** Conflicts detected and shown on `/sod`.
- **NOTE:** SKIP if preserving API credits. Mark as SKIPPED.

### 12.7 Jobs Page
1. Navigate to `/jobs`
- **Expected:** Job history with status, timestamps.

### 12.8 Rate Limiting — AI
1. Rapidly fire 11 requests to `/api/assistant/chat`
- **Expected:** After 10, returns 429.

---

## SUITE 13: Reports & Exports (8 tests)

**Persona: `admin` / `AdminPass@2026!`**

### 13.1 Excel Export
1. Navigate to `/exports`, click Excel
- **Expected:** .xlsx downloads with data sheets.

### 13.2 PDF Export
1. Click PDF export
- **Expected:** .pdf downloads with project summary.

### 13.3 Provisioning CSV
1. Click Provisioning export
- **Expected:** CSV with user-to-role assignments.

### 13.4 SOD Exceptions
1. Click SOD Exceptions export
- **Expected:** Exception report downloads.

### 13.5 Release Comparison
1. Navigate to `/releases/compare`
- **Expected:** Side-by-side Wave 1 vs Wave 2 metrics.

### 13.6 Release Timeline
1. Navigate to `/releases/timeline`
- **Expected:** Timeline with dates and progress bars.

### 13.7 Audit Log Filtering
1. Navigate to `/audit-log`, apply filters
- **Expected:** Filtered results.

### 13.8 GRC Exports
1. Try SailPoint, SAP GRC, or ServiceNow exports
- **Expected:** Format-specific compliance data.

---

## SUITE 14: Navigation & Sidebar (8 tests)

**Any authenticated user.**

### 14.1 All Sidebar Links
1. Click every sidebar nav item
- **Expected:** Each page loads without errors.

### 14.2 Quick Reference
1. Navigate to `/quick-reference`
- **Expected:** Role-specific step-by-step guide.

### 14.3 Responsive — Mobile
1. Resize to 375px width
- **Expected:** Sidebar collapses. Content readable.

### 14.4 Release Selector
1. Click release selector in header
- **Expected:** Wave 1 and Wave 2 visible, "All Releases" option.

### 14.5 Notification Badge
1. Check header bell icon
- **Expected:** Shows unread count if notifications exist.

### 14.6 Breadcrumb/Page Title
1. Navigate to several pages
- **Expected:** Page title in header updates correctly.

### 14.7 User Detail Page
1. Navigate to `/users`, click a user row
- **Expected:** `/users/[userId]` loads with full user profile.

### 14.8 Persona Detail Page
1. Navigate to `/personas`, click a persona
- **Expected:** Detail view with description, users, permissions.

---

## SUITE 15: Data Integrity (5 tests)

**Persona: `sysadmin`**

### 15.1 User Count
- **Expected:** 1,000 users.

### 15.2 Source Roles
- **Expected:** ~21 source roles.

### 15.3 Target Roles
- **Expected:** ~18 target roles.

### 15.4 SOD Rules
- **Expected:** ~82 SOD rules.

### 15.5 Clean State
- **Expected:** 0 personas, 0 mappings, 0 conflicts (before AI pipeline runs).

---

## SUITE 16: Demo Environment Switching (9 tests)

**Persona: Start on login page (log out first).**

For each environment, select it from the dropdown on the login page, wait for the switch, then log in as `admin` / `AdminPass@2026!` and verify:

### 16.1 SAP S/4HANA (Default)
- **Expected:** 1,000 users, SAP ECC source roles, S/4HANA target roles.

### 16.2 Energy & Chemicals
- **Expected:** 100 users, SAP ECC source roles, S/4HANA target roles.

### 16.3 Financial Services
- **Expected:** 100 users, SAP ECC source roles.

### 16.4 Consumer Products
- **Expected:** 100 users, SAP ECC source roles.

### 16.5 Manufacturing
- **Expected:** 100 users, SAP ECC source roles.

### 16.6 Oracle EBS → Oracle Fusion
- **Expected:** 100 users, Oracle EBS source roles (`EBS_*`), Oracle Fusion target roles (`OFC_*`).

### 16.7 Legacy HRIS → Workday
- **Expected:** 100 users, HRIS source roles, Workday target roles (`WD_*`).

### 16.8 Legacy CRM → Salesforce
- **Expected:** 100 users, CRM source roles, Salesforce target roles (`SF_*`).

### 16.9 ServiceNow ITSM
- **Expected:** 100 users, ServiceNow source roles (`SN_*`).

**After Suite 16:** Switch back to "SAP S/4HANA (Default)" for any remaining tests.

---

## Test Execution Notes

- **Order:** Run Suites 1-2 first (public pages + auth). Then Suite 3 (system admin setup). Suites 4-11 (persona-based). Suites 12-15 (features). Suite 16 last (environment switching reseeds data).
- **Account lockout:** Test 2.4 locks `grc.analyst`. Use `viewer` / `Provisum@2026!` for Suite 11 instead.
- **AI tests (12.4-12.6):** Consume API credits. SKIP unless instructed. Mark as SKIPPED.
- **Demo env switching (Suite 16):** Each switch reseeds the database. Run last.
- **Screenshot evidence:** Take a screenshot after each test.
- **Failures:** Note test ID, expected vs actual, and screenshot. Do not fix — just document.
