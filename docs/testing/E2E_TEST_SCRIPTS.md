# End-to-End Test Scripts — Provisum v0.6.0

**Target URL:** https://airm-npt8.onrender.com
**Total test cases:** 95
**Estimated time:** 90–120 minutes

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

---

## SUITE 1: Authentication & Security (14 tests)

**Persona: System Admin (`sysadmin` / `Sysadmin@2026!`)**

### 1.1 Login — Valid Credentials
1. Navigate to `/login`
2. Enter `sysadmin` / `Sysadmin@2026!`
3. Click Login
- **Expected:** Redirect to `/dashboard`. Sidebar shows all sections including ADMIN and SYSTEM.

### 1.2 Login — Invalid Password
1. Navigate to `/login`
2. Enter `sysadmin` / `wrongpassword`
3. Click Login
- **Expected:** Error message "Invalid credentials". No redirect.

### 1.3 Login — Account Lockout
1. Navigate to `/login`
2. Enter `viewer` with wrong password 5 times in rapid succession
- **Expected:** After 5th attempt, error message "Account locked due to too many failed attempts. Try again in 30 minutes." Status 429.

### 1.4 Login — Locked Account Recovery
1. After test 1.3, try logging in as `viewer` with `Provisum@2026!`
- **Expected:** Still locked (429 response). Must wait 30 minutes or reset via DB.
- **Note:** To continue testing viewer, use `mapper.finance` temporarily, or skip ahead and return to viewer tests later.

### 1.5 Password Policy — Weak Password Rejection
1. Log in as `sysadmin`
2. Navigate to Config Console (`/admin`)
3. Go to Users tab, try creating a new user with password `short`
- **Expected:** Error: password must be at least 12 characters, plus complexity errors.

### 1.6 Password Policy — Strong Password Acceptance
1. Same as above but use password `TestUser@2026!`
- **Expected:** User created successfully.

### 1.7 Session — Logout
1. While logged in as `sysadmin`, click the logout button (bottom of sidebar)
- **Expected:** Redirect to `/login`. Clicking back button does NOT return to dashboard.

### 1.8 Session — Unauthenticated Access
1. Clear all cookies / open incognito window
2. Navigate directly to `/dashboard`
- **Expected:** Redirect to `/login`.

### 1.9 Session — API Unauthenticated Access
1. In browser console, run: `fetch('/api/admin/settings').then(r => r.json()).then(console.log)`
- **Expected:** `{ error: "Unauthorized" }` with status 403.

### 1.10 Security Headers
1. Open browser DevTools → Network tab
2. Load any page
3. Inspect response headers
- **Expected:** Headers present: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy` (contains `frame-ancestors 'none'`).

### 1.11 Health Endpoint (No Auth Required)
1. Navigate to `/api/health`
- **Expected:** JSON response `{ "status": "ok", "components": { "database": "connected" }, "timestamp": <number> }`.

### 1.12 Rate Limiting — Login
1. Use browser console to fire 6 rapid login attempts:
```javascript
for(let i=0;i<6;i++) fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:'nobody',password:'wrong'})}).then(r=>console.log(i,r.status))
```
- **Expected:** First 5 return 401, 6th returns 429 with `Retry-After` header.

### 1.13 Change Password
1. Log in as `sysadmin`
2. In browser console:
```javascript
fetch('/api/auth/change-password', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({currentPassword:'Sysadmin@2026!', newPassword:'Sysadmin@2026!'})}).then(r=>r.json()).then(console.log)
```
- **Expected:** Success (same password is allowed since it meets policy). Alternatively test with a new password, then change it back.

### 1.14 Input Validation — Malformed Request
1. In browser console:
```javascript
fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({})}).then(r=>r.json()).then(console.log)
```
- **Expected:** Status 400 with `{ error: "Validation failed", details: [...] }` showing field-level errors.

---

## SUITE 2: System Admin Workflow (16 tests)

**Persona: System Admin (`sysadmin` / `Sysadmin@2026!`)**

### 2.1 Dashboard — KPI Cards
1. Navigate to `/dashboard`
- **Expected:** 4 KPI cards visible: Total Users (10,000), Personas Generated, Mappings, Approvals. Numbers should be non-zero.

### 2.2 Dashboard — Department Mapping Status
1. On dashboard, scroll to department grid
- **Expected:** Grid shows departments (Finance, Procurement, Maintenance, etc.) with stage breakdown (Not Started, Persona Assigned, Mapped, etc.)

### 2.3 Dashboard — Provisioning Alerts
1. On dashboard, check for provisioning alerts section
- **Expected:** If over-provisioned mappings exist, shows alerts with accept/revoke buttons.

### 2.4 Config Console — Settings Tab
1. Navigate to `/admin`
2. Click "Settings" tab
3. View project name, source system, target system fields
- **Expected:** Fields populated with "SAP S/4HANA Migration", "SAP ECC", "SAP S/4HANA".

### 2.5 Config Console — Update Setting
1. Change project name to "Provisum Demo Project"
2. Click Save
3. Refresh page
- **Expected:** Setting persists. Sidebar title may update.

### 2.6 Config Console — Users Tab
1. Click "Users" tab in Config Console
- **Expected:** List of 11 app users visible with roles and org unit assignments.

### 2.7 Config Console — Create User
1. Click "Add User"
2. Fill: username=`testuser`, displayName=`Test User`, password=`TestUser@2026!`, role=mapper, orgUnit=Finance
3. Submit
- **Expected:** User created, appears in list.

### 2.8 Config Console — Org Units Tab
1. Click "Org Units" tab
- **Expected:** Hierarchical tree: Operations → Maintenance/Facilities/Supply Chain/etc., Corporate Services → Finance/Procurement, Technology → Product Development/etc.

### 2.9 Admin Users Page
1. Navigate to `/admin/users`
- **Expected:** Table of app users with username, display name, role, org unit, active status.

### 2.10 Admin Assignments Page
1. Navigate to `/admin/assignments`
- **Expected:** Assignment management UI. Shows mapper/approver assignments to departments.

### 2.11 Audit Log
1. Navigate to `/audit-log`
- **Expected:** Table with recent actions (login events, setting changes from test 2.5, user creation from test 2.7). Timestamps, actors, and actions visible.

### 2.12 Data Upload — Users Page
1. Navigate to `/upload`
- **Expected:** Upload interface with file type selector (users, source-roles, etc.), upload history, source system stats showing 10,000 users.

### 2.13 Source Roles Page
1. Navigate to `/source-roles`
- **Expected:** Table showing ~20 source roles with role ID, name, system (SAP ECC), domain, user count. Expandable rows show permissions.

### 2.14 Target Roles Page
1. Navigate to `/target-roles`
- **Expected:** Table showing ~18 target roles with role ID, name, system (S/4HANA), domain. Expandable rows show permissions.

### 2.15 SOD Rules Page
1. Navigate to `/sod-rules`
- **Expected:** Table of ~82+ SOD rules with rule ID, name, permission A/B, severity (critical/high/medium/low).

### 2.16 Releases Page
1. Navigate to `/releases`
- **Expected:** Two releases: "Wave 1 — Finance & Operations" (in_progress), "Wave 2" (planning). User counts and target dates visible.

---

## SUITE 3: Mapper Workflow — Finance (15 tests)

**Persona: Finance Mapper (`mapper.finance` / `Provisum@2026!`)**

### 3.1 Login and Dashboard Scoping
1. Log in as `mapper.finance`
- **Expected:** Dashboard shows scoped stats for Finance department only (not full 10,000 users). Strapline is task-focused.

### 3.2 Sidebar — Admin Not Visible
1. Check sidebar navigation
- **Expected:** No "ADMIN" or "SYSTEM" sections visible. No Config Console link.

### 3.3 Users Page — Scoped
1. Navigate to `/users`
- **Expected:** Only Finance department users visible (not Maintenance, Procurement, etc.)

### 3.4 Personas Page — View
1. Navigate to `/personas`
- **Expected:** Personas relevant to Finance users. Expandable rows with user groupings.

### 3.5 Personas Page — Search
1. Use search bar to filter personas by name
- **Expected:** Real-time filtering of persona list.

### 3.6 Persona Detail
1. Click on any persona to expand or navigate to detail
- **Expected:** Persona description, user count, business function, permissions list.

### 3.7 Role Mapping Page
1. Navigate to `/mapping`
- **Expected:** Mapping workspace showing Finance-scoped personas. Target role assignment interface.

### 3.8 Bulk Assign Target Roles
1. On mapping page, select multiple personas (checkboxes)
2. Choose a target role from the dropdown
3. Click assign/map button
- **Expected:** Personas assigned to target role. Status updates. Toast confirmation.

### 3.9 SOD Analysis Page
1. Navigate to `/sod`
- **Expected:** SOD conflicts visible (if any exist for Finance users). Severity badges (critical=red, high=orange, etc.)

### 3.10 SOD — Accept Risk (if conflicts exist)
1. Find a medium or high severity conflict
2. Click to expand
3. Enter justification and submit risk acceptance
- **Expected:** Conflict status changes to "pending" or "accepted". Justification saved.

### 3.11 Approvals Page — Mapper View
1. Navigate to `/approvals`
- **Expected:** Shows assignments in approval queue for Finance scope. Mapper cannot approve (no approve button).

### 3.12 Exports Page
1. Navigate to `/exports`
- **Expected:** Export options visible. Click Excel export.
- **Expected:** Excel file downloads with Finance-scoped data.

### 3.13 Inbox
1. Navigate to `/inbox`
- **Expected:** Inbox page loads. May show workflow notifications from persona generation or mapping.

### 3.14 Quick Reference
1. Navigate to `/quick-reference`
- **Expected:** Shows mapper-specific step-by-step guide.

### 3.15 Methodology Page
1. Navigate to `/methodology`
- **Expected:** 6-step workflow explanation renders correctly.

---

## SUITE 4: Mapper Workflow — Maintenance (5 tests)

**Persona: Maintenance Mapper (`mapper.maintenance` / `Provisum@2026!`)**

### 4.1 Login — Scoped to Maintenance
1. Log in as `mapper.maintenance`
2. Navigate to `/dashboard`
- **Expected:** Scoped to Maintenance + Facilities departments. Different data than Finance mapper.

### 4.2 Users — Scoped
1. Navigate to `/users`
- **Expected:** Only Maintenance and Facilities users visible.

### 4.3 Mapping — Scoped
1. Navigate to `/mapping`
- **Expected:** Only personas containing Maintenance/Facilities users shown.

### 4.4 Cross-Scope Access Denied
1. Try to access a persona or user that belongs to Finance (if possible via direct URL manipulation)
- **Expected:** Either not visible or access restricted.

### 4.5 Data Isolation
1. Compare user count on dashboard with `mapper.finance`
- **Expected:** Different counts — each mapper sees only their department's data.

---

## SUITE 5: Approver Workflow (12 tests)

**Persona: Finance Approver (`approver.finance` / `Provisum@2026!`)**

### 5.1 Login and Dashboard
1. Log in as `approver.finance`
- **Expected:** Dashboard shows approver-focused strapline (queue-focused). Scoped to Corporate Services org unit.

### 5.2 Approvals Page — Queue
1. Navigate to `/approvals`
- **Expected:** Approval queue showing Finance-scoped assignments. Approve/reject buttons visible.

### 5.3 Approve a Mapping
1. Find an assignment with status "ready_for_approval" or "compliance_approved"
2. Click Approve
- **Expected:** Status changes to "approved". Toast confirmation. Audit logged.

### 5.4 Reject (Send Back) a Mapping
1. Find another assignment
2. Click Send Back / Reject
3. Enter reason
- **Expected:** Status changes to "sent_back". Reason saved.

### 5.5 Bulk Approve
1. Select multiple assignments (checkboxes)
2. Click Bulk Approve
- **Expected:** All selected assignments approved. Count shown in toast.

### 5.6 SOD — Review Escalated Conflicts
1. Navigate to `/sod`
- **Expected:** Any escalated conflicts visible with "Escalated" status badge.

### 5.7 SOD — Accept Risk as Approver
1. Find an escalated conflict
2. Accept risk with justification
- **Expected:** Conflict resolved. Justification recorded.

### 5.8 Users Page — Scoped
1. Navigate to `/users`
- **Expected:** Users scoped to Corporate Services org unit and descendants (Finance, Procurement).

### 5.9 Personas — View Only
1. Navigate to `/personas`
- **Expected:** Can view personas but mapping actions may be limited to approver scope.

### 5.10 Exports — Scoped
1. Navigate to `/exports`, download PDF report
- **Expected:** PDF downloads. Content should reflect scoped data.

### 5.11 Inbox — Notifications
1. Navigate to `/inbox`
- **Expected:** Any notifications from coordinators or workflow events visible.

### 5.12 Audit Log — Read Access
1. Navigate to `/audit-log`
- **Expected:** Full audit trail visible (read-only for all users).

---

## SUITE 6: Operations Approver (3 tests)

**Persona: Operations Approver (`approver.operations` / `Provisum@2026!`)**

### 6.1 Login — Scoped to Operations
1. Log in as `approver.operations`
- **Expected:** Scoped to Operations org unit (Maintenance, Facilities, Procurement, Supply Chain, Warehouse).

### 6.2 Approvals — Different Queue than Finance Approver
1. Navigate to `/approvals`
- **Expected:** Different set of assignments than `approver.finance` (Operations departments).

### 6.3 SOD — Operations Conflicts
1. Navigate to `/sod`
- **Expected:** Shows SOD conflicts for Operations-scoped users only.

---

## SUITE 7: Viewer — Read-Only Access (8 tests)

**Persona: Viewer (`viewer` / `Provisum@2026!`)**
*Note: If viewer was locked in test 1.3, use `grc.analyst` / `GrcAnalyst@2026!` instead.*

### 7.1 Login
1. Log in as `viewer`
- **Expected:** Redirects to dashboard. No admin/system sections in sidebar.

### 7.2 Dashboard — Full View (No Scope)
1. Check dashboard
- **Expected:** Shows global stats (10,000 users total) since viewer has no org unit restriction.

### 7.3 Users — Read Only
1. Navigate to `/users`
- **Expected:** Full user list visible. No edit/delete buttons.

### 7.4 Personas — Read Only
1. Navigate to `/personas`
- **Expected:** Persona list visible. No generate/delete/bulk actions.

### 7.5 Mapping — Read Only
1. Navigate to `/mapping`
- **Expected:** Mapping data visible. No assign/edit buttons or they're disabled.

### 7.6 SOD — Read Only
1. Navigate to `/sod`
- **Expected:** Conflicts visible. No accept-risk/escalate buttons.

### 7.7 Approvals — No Actions
1. Navigate to `/approvals`
- **Expected:** Approval queue visible. No approve/reject buttons.

### 7.8 Admin — Access Denied
1. Navigate directly to `/admin`
- **Expected:** Redirect to `/unauthorized` or access denied message.

---

## SUITE 8: AI Pipeline (8 tests)

**Persona: System Admin (`sysadmin` / `Sysadmin@2026!`)**

### 8.1 Lumen AI Chatbot — Open
1. Press `Cmd+K` (or click the chat icon)
- **Expected:** Lumen chatbot opens. Input field ready.

### 8.2 Lumen — Ask a Question
1. Type "How many users are in the Finance department?"
- **Expected:** Streaming response with project-aware data. Should reference actual user counts.

### 8.3 Lumen — Role-Aware Context
1. Ask "What should I do next?"
- **Expected:** Response tailored to system_admin role (executive overview, not task-specific).

### 8.4 AI Pipeline — Persona Generation (SKIP if demo data is critical)
1. Navigate to `/personas`
2. If a "Generate Personas" button exists, click it
3. Monitor job progress on `/jobs`
- **Expected:** Job starts, shows progress %, completes. New personas appear.
- **WARNING:** This modifies data. Only run if you're OK regenerating personas.

### 8.5 AI Pipeline — Target Role Mapping (SKIP if demo data is critical)
1. Navigate to `/jobs`
2. Start target role mapping job
- **Expected:** Job completes. Mappings created between personas and target roles.

### 8.6 AI Pipeline — SOD Analysis (SKIP if demo data is critical)
1. Navigate to `/jobs`
2. Start SOD analysis
- **Expected:** Job completes. SOD conflicts detected and displayed on `/sod`.

### 8.7 Jobs Page — Job History
1. Navigate to `/jobs`
- **Expected:** All job history visible with status, timestamps, duration.

### 8.8 Rate Limiting — AI Endpoints
1. In browser console, rapidly fire 11 requests to `/api/assistant/chat`
- **Expected:** After 10, receives 429 Too Many Requests.

---

## SUITE 9: Reports & Exports (8 tests)

**Persona: Admin (`admin` / `AdminPass@2026!`)**

### 9.1 Excel Export
1. Navigate to `/exports`
2. Click Excel export
- **Expected:** .xlsx file downloads. Open and verify: users, roles, mappings sheets.

### 9.2 PDF Export
1. Click PDF export
- **Expected:** .pdf file downloads with project summary, mapping status, SOD summary.

### 9.3 Provisioning Export
1. Click Provisioning CSV export
- **Expected:** CSV with user-to-target-role assignments for provisioning systems.

### 9.4 SOD Exceptions Export
1. Click SOD Exceptions export
- **Expected:** Export of all SOD exceptions with justifications.

### 9.5 Release Comparison
1. Navigate to `/releases/compare`
- **Expected:** Side-by-side comparison of Wave 1 and Wave 2 metrics.

### 9.6 Release Timeline
1. Navigate to `/releases/timeline`
- **Expected:** Timeline view with dates, progress bars, user counts per release.

### 9.7 Audit Log — Filtering
1. Navigate to `/audit-log`
2. Filter by action type or user
- **Expected:** Filtered results display correctly.

### 9.8 GRC Exports (Optional)
1. Navigate to exports, try SailPoint/SAP GRC/ServiceNow exports if available
- **Expected:** Each generates format-specific compliance data.

---

## SUITE 10: Navigation & UI Polish (6 tests)

**Persona: Any authenticated user**

### 10.1 Sidebar — All Links Work
1. Click every sidebar nav item systematically
- **Expected:** Each page loads without errors. No blank pages or 500 errors.

### 10.2 Responsive — Mobile
1. Resize browser to mobile width (~375px)
- **Expected:** Sidebar collapses. Content remains readable. No horizontal overflow.

### 10.3 Landing Page
1. Log out. Navigate to `/`
- **Expected:** Public landing page with hero section, feature highlights, login link.

### 10.4 Methodology Page
1. Navigate to `/methodology`
- **Expected:** 6-step workflow diagram/explanation renders correctly.

### 10.5 Overview Page
1. Navigate to `/overview`
- **Expected:** Platform capabilities overview renders.

### 10.6 Error Handling — 404
1. Navigate to `/nonexistent-page`
- **Expected:** 404 page or redirect, not a blank screen or stack trace.

---

## SUITE 11: Data Integrity Verification (5 tests)

**Persona: System Admin (`sysadmin`)**

### 11.1 User Count Verification
1. Navigate to `/users`
2. Check total count
- **Expected:** 10,000 users (default pack).

### 11.2 Source Role Count
1. Navigate to `/source-roles`
- **Expected:** ~21 source roles.

### 11.3 Target Role Count
1. Navigate to `/target-roles`
- **Expected:** ~18 target roles.

### 11.4 SOD Rule Count
1. Navigate to `/sod-rules`
- **Expected:** ~82 SOD rules (61 from CSV + 21 hardcoded S/4HANA rules).

### 11.5 SOD Conflict Count
1. Navigate to `/sod`
- **Expected:** ~37 SOD conflicts across 37 users (from seed verification).

---

## Test Execution Notes

- **Order matters:** Run Suite 1 first (auth tests). Then Suite 2 (system admin setup). Then Suites 3-7 (persona-based). Suites 8-11 can run in any order.
- **Account lockout:** Test 1.3 locks the `viewer` account. Use `grc.analyst` / `GrcAnalyst@2026!` as a substitute viewer for Suite 7 if needed.
- **AI tests (Suite 8):** Tests 8.4-8.6 modify data. Only run if regenerating personas/mappings is acceptable.
- **Screenshot evidence:** Take a screenshot after each test for the test report.
- **Failures:** Note the test ID, actual behavior, and screenshot. Do not try to fix — just document.
