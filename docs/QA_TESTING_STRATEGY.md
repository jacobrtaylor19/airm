# Provisum v0.7.0 -- Comprehensive QA Testing Strategy

**Prepared:** 2026-03-28
**Application:** Provisum (Intelligent Role Mapping for Enterprise Migrations)
**Live URL:** https://demo.provisum.io
**Stack:** Next.js 14, Supabase Postgres (Drizzle ORM), Supabase Auth, Vercel deployment

---

## 1. Testing Strategy Overview

### 1.1 Objective

Validate every user-facing feature, API endpoint, role-based access control, data flow, and security control in Provisum before acquisition demo. Zero tolerance for broken workflows, incorrect data display, or unauthorized access.

### 1.2 Environments

| Environment | URL | Purpose |
|---|---|---|
| Production | https://demo.provisum.io | Primary test target |
| Health Check | https://demo.provisum.io/api/health | Infrastructure verification |

### 1.3 Test Accounts

| Username | Password | Role | Scope |
|---|---|---|---|
| demo.admin | DemoGuide2026! | admin | All data (unrestricted) |
| demo.mapper.finance | DemoGuide2026! | mapper | Finance org unit + descendants |
| demo.mapper.operations | DemoGuide2026! | mapper | Operations org unit + descendants |
| demo.approver | DemoGuide2026! | approver | All data (unrestricted) |
| demo.viewer | DemoGuide2026! | viewer | All data (read-only) |
| demo.coordinator | DemoGuide2026! | coordinator | Assigned org unit + descendants |
| sysadmin | Sysadmin@2026! | system_admin | All data (unrestricted, system config) |

### 1.4 Test Data

The database is seeded with:
- 1,000 source system users across multiple departments
- 21 source roles (SAP ECC)
- 18 target roles (S/4HANA)
- 92 SOD rules
- 17 app users (7 demo + 10 seeded)
- Org unit hierarchy (L1/L2/L3)

### 1.5 Approach

1. **Functional testing** -- Every UI page, form, button, and workflow
2. **Role-based access testing** -- Every feature tested with every role
3. **Negative testing** -- Invalid inputs, boundary conditions, unauthorized access
4. **Security testing** -- Headers, cookies, CSP, injection attempts
5. **API testing** -- Direct endpoint calls to verify auth guards
6. **Cross-browser** -- Chrome, Firefox, Safari (latest)

---

## 2. Test Scenarios by Module

---

### 2.1 Authentication (AUTH)

#### AUTH-001: Successful Login with Demo Admin
- **Preconditions:** Not logged in, on /login page
- **Steps:**
  1. Navigate to https://demo.provisum.io/login
  2. Verify the Provisum branding is displayed (left panel on desktop, top on mobile)
  3. Verify quick-login pill buttons are displayed with demo account names
  4. Click the "demo.admin" pill button (or type "demo.admin" in username field)
  5. Enter password "DemoGuide2026!" in password field
  6. Click "Sign In" button
- **Expected Result:** Redirect to /dashboard. Sidebar shows user initials and "Admin" role. Dashboard loads with KPI cards.

#### AUTH-002: Successful Login for Each Demo Account
- **Preconditions:** Not logged in
- **Steps:** Repeat AUTH-001 for each of the 7 demo accounts
- **Expected Result:** Each account logs in successfully. Sidebar displays correct role label. Scoped users (mapper, coordinator) see filtered data on dashboard.

#### AUTH-003: Login with Invalid Password
- **Preconditions:** Not logged in, on /login page
- **Steps:**
  1. Enter username "demo.admin"
  2. Enter password "WrongPassword123!"
  3. Click "Sign In"
- **Expected Result:** Error message "Invalid credentials" displayed. User remains on /login page. No redirect.

#### AUTH-004: Login with Non-Existent Username
- **Preconditions:** Not logged in, on /login page
- **Steps:**
  1. Enter username "nonexistent.user"
  2. Enter password "DemoGuide2026!"
  3. Click "Sign In"
- **Expected Result:** Error message "Invalid credentials" displayed. No indication whether username exists (prevents enumeration).

#### AUTH-005: Login with Empty Fields
- **Preconditions:** Not logged in, on /login page
- **Steps:**
  1. Leave username empty
  2. Leave password empty
  3. Click "Sign In"
- **Expected Result:** Validation error or "Username and password are required" message. No API call fires.

#### AUTH-006: Error Clears on Input Change
- **Preconditions:** AUTH-003 completed (error message visible)
- **Steps:**
  1. Observe error message from failed login
  2. Start typing in the username or password field
- **Expected Result:** Error message clears when user begins typing.

#### AUTH-007: Already Logged In Redirect
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate directly to /login
- **Expected Result:** Automatically redirected to /dashboard (no login form shown).

#### AUTH-008: Logout
- **Preconditions:** Logged in as any user
- **Steps:**
  1. Look for logout mechanism (typically via sidebar or user menu)
  2. Trigger logout
- **Expected Result:** Session destroyed. Redirected to /login. Navigating to /dashboard now redirects to /login.

#### AUTH-009: Session Persistence Across Page Navigation
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /dashboard
  2. Navigate to /mapping
  3. Navigate to /sod
  4. Refresh the page
- **Expected Result:** User remains authenticated throughout. No unexpected redirects to /login.

#### AUTH-010: Unauthorized Page
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Navigate directly to /admin/users
- **Expected Result:** Redirected to /unauthorized page. Page shows branded message explaining insufficient permissions.

#### AUTH-011: Unauthenticated Access to Protected Route
- **Preconditions:** Not logged in (clear cookies)
- **Steps:**
  1. Navigate directly to /dashboard
- **Expected Result:** Redirected to /login.

#### AUTH-012: Audit Log Entry for Login
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. Log in as demo.admin in another browser/incognito
  2. Navigate to /audit-log as sysadmin
  3. Search for "login_success" entries
- **Expected Result:** Audit log contains entry for demo.admin's login with IP address and timestamp.

#### AUTH-013: Audit Log Entry for Failed Login
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. Attempt login with wrong password in incognito
  2. Navigate to /audit-log as sysadmin
- **Expected Result:** Audit log contains "login_failure" entry with username and reason.

#### AUTH-014: Quick-Login Pill Buttons
- **Preconditions:** Not logged in, on /login page
- **Steps:**
  1. Verify teal pill buttons are shown for demo accounts
  2. Click a pill button
- **Expected Result:** Username field is populated with the clicked account's username. Password may also auto-fill.

---

### 2.2 Dashboard (DASH)

#### DASH-001: Dashboard Loads with All Sections
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /dashboard
  2. Scroll through entire page
- **Expected Result:** The following sections are all visible:
  - Workflow Stepper (Upload, Personas, Mapping, SOD Analysis, Approval)
  - Status Strapline banner (colored, with icon)
  - "Project Role Mapping Progress" KPI cards (Total Users, Personas Generated, Persona Coverage, Mapped to Roles, Approved)
  - Existing Production Access summary (if applicable)
  - Risk Quantification cards (Business Continuity, Adoption Risk, Incorrect Access)
  - Department Mapping Progress (filterable kanban grid)
  - Attention Required card
  - Provisioning Alerts (if any)
  - Source Systems card

#### DASH-002: KPI Cards Display Correct Numbers
- **Preconditions:** Logged in as demo.admin, demo data seeded
- **Steps:**
  1. Navigate to /dashboard
  2. Read each KPI card value
  3. Cross-reference with /users count, /personas count, /mapping count, /approvals count
- **Expected Result:** Numbers on KPI cards match actual record counts in the corresponding data pages.

#### DASH-003: Workflow Stepper Stage Status
- **Preconditions:** Logged in as demo.admin, data uploaded but no personas generated
- **Steps:**
  1. Navigate to /dashboard
  2. Examine the Workflow Stepper
- **Expected Result:** "Upload" stage shows "complete" (green check). "Personas" shows "not_started". Subsequent stages also show "not_started". Each stage is clickable and navigates to its respective page.

#### DASH-004: Strapline Content Matches Project State
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /dashboard
  2. Read the strapline text
- **Expected Result:** Strapline text accurately describes the current bottleneck (e.g., "No personas generated yet -- run persona generation to begin mapping"). Tone-based coloring matches content (positive=emerald, action=orange, warning=yellow, neutral=blue).

#### DASH-005: Department Filter Dropdown
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /dashboard
  2. Find the department filter dropdown in "Department Mapping Progress" section
  3. Select a specific department
  4. Observe the kanban grid and summary stats
- **Expected Result:** Only the selected department's data is shown. Summary counts (Users, Persona Assigned, Mapped, SOD Rejected, SOD Clean, Approved) update to reflect the filtered scope.

#### DASH-006: Department Kanban Grid Display
- **Preconditions:** Logged in as demo.admin, some departments have varied progress
- **Steps:**
  1. Navigate to /dashboard
  2. Scroll to Department Mapping Progress section
  3. Examine individual department rows
- **Expected Result:** Each department shows a stacked progress bar with color-coded stages (Not Started=slate, Persona=slate, Mapped=yellow, SOD Conflict=red, SOD Clean=blue, Approved=emerald). Department rows with all users approved show green border with "Complete" badge. Departments with SOD conflicts show red border.

#### DASH-007: Mapper Sees Scoped Dashboard
- **Preconditions:** Logged in as demo.mapper.finance
- **Steps:**
  1. Navigate to /dashboard
  2. Examine strapline, department filter, KPI cards
- **Expected Result:** Strapline includes an "area" portion specific to the mapper's scope. Department filter defaults to the mapper's assigned department(s). Department grid shows only departments in scope (or "All" still scoped to assigned departments).

#### DASH-008: Risk Quantification Cards Display
- **Preconditions:** Logged in as demo.admin, SOD analysis has been run
- **Steps:**
  1. Navigate to /dashboard
  2. Find "Risk Quantification" section
  3. Click "View full analysis" link
- **Expected Result:** Three risk cards shown (Business Continuity, Adoption Risk, Incorrect Access) with numeric values and color-coded borders. Link navigates to /risk-analysis.

#### DASH-009: Attention Required Section
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /dashboard
  2. Find "Attention Required" card
- **Expected Result:** Card lists any SOD conflicts (by severity), low confidence assignments (<65%), over-provisioned roles pending review, unmapped personas, or missing SOD ruleset. If no issues, shows "No SOD conflicts detected yet".

#### DASH-010: Provisioning Alerts Section
- **Preconditions:** Logged in as demo.admin, over-provisioning alerts exist
- **Steps:**
  1. Navigate to /dashboard
  2. Find "Provisioning Alerts" card
  3. Click "Accept" on an alert
  4. Enter justification text
  5. Click "Confirm"
- **Expected Result:** Alert shows persona name, target role, excess %, user count. After acceptance, alert shows "Excepted" badge with "Revoke" option. Page refreshes with updated state.

#### DASH-011: Provisioning Alert -- Revoke Exception
- **Preconditions:** DASH-010 completed (an exception exists)
- **Steps:**
  1. Find the excepted alert
  2. Click "Revoke"
- **Expected Result:** Exception removed. Alert returns to "pending" state with "Accept" button.

#### DASH-012: Source Systems Card
- **Preconditions:** Logged in as demo.admin, source roles uploaded
- **Steps:**
  1. Navigate to /dashboard
  2. Find "Source Systems" card at bottom
- **Expected Result:** Shows each source system (e.g., "SAP ECC") with role count and user count.

---

### 2.3 Releases (REL)

#### REL-001: View Releases List
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /releases via sidebar
- **Expected Result:** Page shows "Releases" heading with description. Release cards show name, status badge, type badge, target system, target date, progress bar, stats (assignments, approved, SOD flagged, pending), scope info. Active release banner at top if one exists.

#### REL-002: Create New Release
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /releases
  2. Click "New Release" button
  3. Fill in: Name = "Test Wave 2", Description = "Testing release creation", Status = "Planning", Type = "Incremental", Target System = "SAP S/4HANA", Target Date = "2026-06-01"
  4. Set Mapping Deadline = "2026-05-01", Review Deadline = "2026-05-15", Approval Deadline = "2026-05-25"
  5. Check "Set as active release"
  6. Click "Create Release"
- **Expected Result:** Toast shows "Release created". New release card appears in list with "Active" badge. Active release banner updates.

#### REL-003: Create Release Without Name (Negative)
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Click "New Release"
  2. Leave name empty
  3. Click "Create Release"
- **Expected Result:** Toast error "Release name is required". Dialog stays open.

#### REL-004: Edit Existing Release
- **Preconditions:** Logged in as demo.admin, at least one release exists
- **Steps:**
  1. Navigate to /releases
  2. Click "Edit" on a release card
  3. Change name and status
  4. Click "Save Changes"
- **Expected Result:** Toast shows "Release updated". Card reflects updated values.

#### REL-005: Set Active Release
- **Preconditions:** Logged in as demo.admin, multiple releases exist, one is active
- **Steps:**
  1. Navigate to /releases
  2. Click "View" on a non-active release
- **Expected Result:** Toast shows the release is now active. Active release banner updates.

#### REL-006: Delete Release
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /releases
  2. Click "Delete" on a release
  3. Confirm the browser dialog
- **Expected Result:** Toast shows "Release deleted". Release removed from list.

#### REL-007: Delete Release Cancellation
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Click "Delete" on a release
  2. Click "Cancel" in browser confirmation dialog
- **Expected Result:** Release not deleted. No change.

#### REL-008: Overdue Deadline Display
- **Preconditions:** Logged in as demo.admin, a release has past-due deadlines
- **Steps:**
  1. Navigate to /releases
  2. Observe deadline dates on release cards
- **Expected Result:** Past-due deadlines shown in red text.

#### REL-009: Non-Admin Cannot Create/Edit/Delete
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Navigate to /releases
- **Expected Result:** "New Release" button is not visible. No "Edit" or "Delete" buttons on release cards.

#### REL-010: Unlinked Assignments Banner
- **Preconditions:** Logged in as demo.admin, assignments exist without release linkage
- **Steps:**
  1. Navigate to /releases
- **Expected Result:** Yellow banner shows count of unlinked assignments.

---

### 2.4 Data Upload (UPL)

#### UPL-001: Upload Page Sections Display
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /upload via sidebar
- **Expected Result:** Page shows: Workflow Stepper, instruction text, sections for Project Structure (Org Units, Releases, Release Scope), Source Data (User List*, Legacy Role Definitions*, Legacy Role Assignments, Role-Permission Mapping), Target Data (Target Role Library*, Target Role Permissions), Compliance (SOD/GRC Ruleset), Optional (Existing Production Access, Pre-defined Personas, Provisum Users). Required items marked with *.

#### UPL-002: Upload Users CSV
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /upload
  2. Find "User List" upload card
  3. Click upload button or drop zone
  4. Select a valid CSV file with columns: source_user_id, display_name, email, job_title, department
  5. Wait for processing
- **Expected Result:** Success message. Existing count updates. If replacing data, confirm the count changed.

#### UPL-003: Upload Invalid CSV Format
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Upload a CSV missing required columns (e.g., no source_user_id column)
- **Expected Result:** Error message indicating missing columns. Data not imported.

#### UPL-004: Upload Non-CSV File (Negative)
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Attempt to upload a .txt or .xlsx file to a CSV upload card
- **Expected Result:** Error or rejection message. Data not imported.

#### UPL-005: View-Only for Non-Admin
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Navigate to /upload
- **Expected Result:** Yellow banner says "View only -- data uploads are restricted to administrators." Upload buttons/drop zones are hidden or disabled. Existing counts are visible.

#### UPL-006: Download CSV Template
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /upload
  2. Click template download link on any upload card (e.g., "users-template.csv")
- **Expected Result:** CSV template file downloads with expected column headers.

#### UPL-007: Upload Source Roles
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Upload valid source-roles CSV with columns: role_id, role_name, description, system, domain
- **Expected Result:** Source roles imported. Count updates. /source-roles page shows new data.

#### UPL-008: Upload Target Roles
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Upload valid target-roles CSV
- **Expected Result:** Target roles imported. /target-roles page shows new data.

#### UPL-009: Upload SOD Rules
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Upload valid SOD rules CSV with columns: rule_id, rule_name, permission_a, permission_b, severity
- **Expected Result:** SOD rules imported. /sod-rules page shows new data.

#### UPL-010: "Proceed to Persona Generation" Button
- **Preconditions:** Logged in as demo.admin, all 3 required files uploaded
- **Steps:**
  1. Navigate to /upload
  2. Verify "3 of 3 required files uploaded" status
  3. Click "Proceed to Persona Generation"
- **Expected Result:** Navigates to /personas page.

#### UPL-011: "Proceed to Persona Generation" Disabled
- **Preconditions:** Logged in as demo.admin, fewer than 3 required files uploaded
- **Steps:**
  1. Navigate to /upload
- **Expected Result:** "Proceed to Persona Generation" button is disabled.

#### UPL-012: Source Systems Summary
- **Preconditions:** Logged in as demo.admin, multi-system source roles uploaded
- **Steps:**
  1. Navigate to /upload
  2. Scroll to "Source Systems Uploaded" card
- **Expected Result:** Shows each system with role count and user count.

---

### 2.5 Personas (PER)

#### PER-001: View Personas List
- **Preconditions:** Logged in as demo.admin, personas generated
- **Steps:**
  1. Navigate to /personas via sidebar
- **Expected Result:** Two tabs visible: "Personas" and "Consolidated Groups". Persona list shows persona names with user counts, confidence scores, business function, mapped role count. Search bar and business function filter dropdown present.

#### PER-002: Generate Personas (AI Pipeline)
- **Preconditions:** Logged in as demo.admin, users and source roles uploaded, no personas exist
- **Steps:**
  1. Navigate to /personas
  2. Click "Generate Personas" button
  3. Wait for job to complete (polls automatically)
- **Expected Result:** Button shows loading state. After completion, personas appear in the list. Each persona has a name, description, user count, confidence score. Toast or status message confirms completion.

#### PER-003: Generate Personas -- Viewer Cannot Run
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Navigate to /personas
  2. Look for "Generate Personas" button
- **Expected Result:** Button is either not shown or shows a status badge instead of an action button.

#### PER-004: Expand Persona Detail
- **Preconditions:** Logged in as demo.admin, personas exist
- **Steps:**
  1. Navigate to /personas
  2. Click expand arrow on a persona row
- **Expected Result:** Expanded view shows assigned users, AI reasoning, confidence score, mapped target roles.

#### PER-005: Search Personas
- **Preconditions:** Logged in as demo.admin, multiple personas exist
- **Steps:**
  1. Navigate to /personas
  2. Type a partial persona name in the search box
- **Expected Result:** List filters to show only matching personas.

#### PER-006: Filter by Business Function
- **Preconditions:** Logged in as demo.admin, personas have varied business functions
- **Steps:**
  1. Navigate to /personas
  2. Select a business function from the filter dropdown
- **Expected Result:** List shows only personas with the selected business function.

#### PER-007: Consolidated Groups Tab
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /personas
  2. Click "Consolidated Groups" tab
- **Expected Result:** Table shows group names, descriptions, access levels, domains, persona count, user count. Sortable columns.

#### PER-008: Bulk Delete Personas (Admin)
- **Preconditions:** Logged in as demo.admin, personas exist
- **Steps:**
  1. Navigate to /personas
  2. Select multiple persona checkboxes
  3. Click bulk delete action
  4. Confirm deletion
- **Expected Result:** Selected personas deleted. List updates. Toast confirms deletion.

#### PER-009: Bulk Delete -- Non-Admin Cannot
- **Preconditions:** Logged in as demo.mapper.finance
- **Steps:**
  1. Navigate to /personas
  2. Look for checkboxes or delete functionality
- **Expected Result:** No checkboxes or bulk delete option visible.

#### PER-010: Persona Detail Page
- **Preconditions:** Logged in as demo.admin, personas exist
- **Steps:**
  1. Navigate to /personas
  2. Click on a persona name or navigate to /personas/[personaId]
- **Expected Result:** Detail page shows persona info, assigned users, mapped target roles, AI reasoning, confidence score, source permissions, excess %.

---

### 2.6 Role Mapping (MAP)

#### MAP-001: View Mapping Page
- **Preconditions:** Logged in as demo.admin, personas generated
- **Steps:**
  1. Navigate to /mapping via sidebar
- **Expected Result:** Page shows persona list on the left (selectable), target role mapping area on the right, tabs for different views (persona mapping, user refinements, gap analysis). Auto-Map button visible.

#### MAP-002: Auto-Map Roles (AI Pipeline)
- **Preconditions:** Logged in as demo.admin, personas and target roles exist
- **Steps:**
  1. Navigate to /mapping
  2. Click "Auto-Map" button
  3. Wait for job to complete
- **Expected Result:** Loading state shown. After completion, personas show mapped target roles with coverage %, excess %, and confidence indicators. Toast confirms completion.

#### MAP-003: Auto-Map -- Viewer Cannot Run
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Navigate to /mapping
  2. Look for "Auto-Map" button
- **Expected Result:** Button not shown or shows read-only status badge.

#### MAP-004: Manual Role Assignment (Add Role)
- **Preconditions:** Logged in as demo.admin, a persona is selected
- **Steps:**
  1. Navigate to /mapping
  2. Select a persona from the list
  3. From the "Available" target roles panel, drag or click a role to add it
  4. Click "Save" button
- **Expected Result:** Role appears in "Mapped" section. "Save" button enabled when changes are dirty. Toast confirms "Mapping saved". Coverage % updates.

#### MAP-005: Manual Role Assignment (Remove Role)
- **Preconditions:** Logged in as demo.admin, a persona has mapped roles
- **Steps:**
  1. Select a persona with mapped roles
  2. Remove a role from the mapped section (drag or click remove)
  3. Click "Save"
- **Expected Result:** Role moves back to available. Mapping saved. Coverage % updates.

#### MAP-006: Role Search in Mapping
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /mapping
  2. Type in the role search box
- **Expected Result:** Available roles filter to match search query.

#### MAP-007: Submit for Review
- **Preconditions:** Logged in as demo.mapper.finance, assignments in "draft" status
- **Steps:**
  1. Navigate to /mapping
  2. Find assignments with "draft" status
  3. Click "Submit for Review" button
- **Expected Result:** Assignment status changes to "pending_review". Assignment becomes locked (no longer editable by mapper).

#### MAP-008: Over-Provisioning Badge on Roles
- **Preconditions:** Logged in as demo.admin, excess threshold is 30%, some roles exceed it
- **Steps:**
  1. Navigate to /mapping
  2. Examine role chips on a persona's mapped roles
- **Expected Result:** Roles with excess % >= threshold show orange over-provisioning badge.

#### MAP-009: SOD Conflict Display on Mapping
- **Preconditions:** Logged in as demo.admin, SOD analysis has been run
- **Steps:**
  1. Navigate to /mapping
  2. Select a persona with SOD conflicts
- **Expected Result:** SOD conflicts shown with severity indicators near the conflicting roles.

#### MAP-010: Gap Analysis Tab
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /mapping
  2. Click the gap analysis tab/view
- **Expected Result:** Shows source permissions not covered by any mapped target role, with gap type and notes.

#### MAP-011: Mapper Scope Restriction
- **Preconditions:** Logged in as demo.mapper.finance
- **Steps:**
  1. Navigate to /mapping
  2. Check which personas are visible
- **Expected Result:** Only personas belonging to users in the mapper's assigned org unit scope are shown.

---

### 2.7 SOD Analysis (SOD)

#### SOD-001: View SOD Analysis Page
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /sod via sidebar
- **Expected Result:** Page shows summary cards (Critical, High, Medium, Low counts; Open, Pending Risk Acceptance, Resolved). Filter dropdowns (severity, status, conflict type). Search box. Conflict list below.

#### SOD-002: Run SOD Analysis
- **Preconditions:** Logged in as demo.admin, mappings exist, SOD rules uploaded
- **Steps:**
  1. Navigate to /sod
  2. Click "Run Analysis" button
  3. Wait for completion
- **Expected Result:** Analysis runs. Summary counts update. Conflict list populates. Toast or status confirms completion.

#### SOD-003: Run SOD Analysis -- Viewer Cannot
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Navigate to /sod
  2. Look for "Run Analysis" button
- **Expected Result:** Button not shown or disabled.

#### SOD-004: Filter by Severity
- **Preconditions:** Logged in as demo.admin, conflicts exist
- **Steps:**
  1. Navigate to /sod
  2. Select "Critical" from severity filter
- **Expected Result:** Only critical-severity conflicts shown.

#### SOD-005: Filter by Status
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Select "Open" from status filter
- **Expected Result:** Only open (unresolved) conflicts shown.

#### SOD-006: Filter by Conflict Type
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Select "between_role" from conflict type filter
- **Expected Result:** Only between-role conflicts shown (within-role filtered out).

#### SOD-007: Expand Conflict Detail
- **Preconditions:** Logged in as demo.admin, conflicts exist
- **Steps:**
  1. Click on a conflict row to expand
- **Expected Result:** Expanded view shows user name, conflicting roles (Role A, Role B), conflicting permissions (Permission A, Permission B), severity, conflict type, risk explanation.

#### SOD-008: Fix Mapping (Remove Role)
- **Preconditions:** Logged in as demo.admin or demo.mapper.finance, open conflicts exist
- **Steps:**
  1. Expand a conflict
  2. Click "Remove Role" option for one of the conflicting roles
  3. Confirm in dialog
- **Expected Result:** Role removed from user's assignments. Conflict status changes to "mapping_fixed". Toast confirms.

#### SOD-009: Accept Risk
- **Preconditions:** Logged in as demo.approver or demo.admin, open conflicts exist
- **Steps:**
  1. Expand a conflict
  2. Click "Accept Risk"
  3. Enter justification
  4. Confirm
- **Expected Result:** Conflict status changes to "risk_accepted". Justification stored. Toast confirms.

#### SOD-010: Escalate Conflict
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Expand a conflict
  2. Click "Escalate"
  3. Enter escalation reason
  4. Confirm
- **Expected Result:** Conflict status changes to "escalated" or "sod_escalated". Reason stored.

#### SOD-011: Within-Role Conflict Visibility
- **Preconditions:** Logged in as demo.mapper.finance (not a security specialist)
- **Steps:**
  1. Navigate to /sod
  2. Look for within_role type conflicts
- **Expected Result:** Within-role conflicts are hidden for regular mappers. Only between-role conflicts shown.

#### SOD-012: Search Conflicts
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Type a user name or rule name in the search box
- **Expected Result:** Conflicts filter to match search query.

---

### 2.8 Approvals (APR)

#### APR-001: View Approvals Queue
- **Preconditions:** Logged in as demo.approver
- **Steps:**
  1. Navigate to /approvals via sidebar
- **Expected Result:** Page shows counts (Ready for Approval, Approved, Compliance Approved, SOD Risk Accepted, Total). Table of assignments with columns: user name, department, target role, status, confidence badge, SOD conflict count. Department filter available.

#### APR-002: Approve Single Assignment
- **Preconditions:** Logged in as demo.approver, assignments in "compliance_approved" or "ready_for_approval" status
- **Steps:**
  1. Navigate to /approvals
  2. Find an approvable assignment
  3. Click "Approve" button
- **Expected Result:** Assignment status changes to "approved". Toast confirms. Row updates or moves to approved section.

#### APR-003: Send Back Assignment
- **Preconditions:** Logged in as demo.approver or demo.mapper.finance
- **Steps:**
  1. Navigate to /approvals
  2. Click "Send Back" on an assignment
  3. Enter reason in the dialog
  4. Click confirm
- **Expected Result:** Assignment status reverts to "draft". Reason stored. Toast confirms. Assignment editable by mapper again.

#### APR-004: Send Back Without Reason (Negative)
- **Preconditions:** Logged in as demo.approver
- **Steps:**
  1. Click "Send Back" on an assignment
  2. Leave reason empty
  3. Try to confirm
- **Expected Result:** Confirm button disabled or validation error. Cannot submit without reason.

#### APR-005: Bulk Approve Assignments
- **Preconditions:** Logged in as demo.approver, multiple approvable assignments
- **Steps:**
  1. Select multiple assignments via checkboxes
  2. Click "Bulk Approve" button
- **Expected Result:** All selected assignments change to "approved". Toast confirms count.

#### APR-006: Department-Based Bulk Approve
- **Preconditions:** Logged in as demo.approver
- **Steps:**
  1. Click department filter
  2. Select a department
  3. Use department-level approve action
- **Expected Result:** All approvable assignments in that department are approved.

#### APR-007: Viewer Cannot Approve or Send Back
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Navigate to /approvals
- **Expected Result:** Approve, Send Back, and Bulk Approve buttons are not visible. Read-only view of the queue.

#### APR-008: Mapper Cannot Approve
- **Preconditions:** Logged in as demo.mapper.finance
- **Steps:**
  1. Navigate to /approvals
  2. Look for "Approve" button
- **Expected Result:** Approve button not shown. Mapper can see assignments and can "Send Back" but cannot approve.

#### APR-009: Coordinator Cannot Approve
- **Preconditions:** Logged in as demo.coordinator
- **Steps:**
  1. Navigate to /approvals
- **Expected Result:** No approve/send-back buttons. Read-only view.

#### APR-010: Department Filter
- **Preconditions:** Logged in as demo.approver, assignments from multiple departments
- **Steps:**
  1. Select a department from the filter
- **Expected Result:** Only assignments from the selected department shown.

---

### 2.9 Risk Analysis (RISK)

#### RISK-001: View Risk Analysis Page
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /risk-analysis via sidebar
- **Expected Result:** Three risk category cards: Business Continuity (users at risk <90% coverage, avg coverage), Adoption Risk (users with >10 new permissions, total new perms), Incorrect Access (flagged users with gaps + SOD). Each card shows risk level badge (Low/Medium/High). Analysis Summary section with 4 metrics. Flagged Users table if any exist.

#### RISK-002: Risk Level Thresholds
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /risk-analysis
  2. Note the risk level badges
- **Expected Result:** Business Continuity: Low <= 5, Medium 6-20, High > 20. Adoption: Low <= 10, Medium 11-30, High > 30. Incorrect Access: Low <= 3, Medium 4-10, High > 10. Border colors match: high=red, medium=yellow, low=default.

#### RISK-003: Flagged Users Table
- **Preconditions:** Logged in as demo.admin, flagged users exist
- **Steps:**
  1. Navigate to /risk-analysis
  2. Scroll to "Flagged Users" section
- **Expected Result:** Table shows user name, department, coverage %, uncovered perms, new perms, SOD conflict count. Coverage <80% shows in red, <90% in orange.

#### RISK-004: Scoped Risk Analysis for Mapper
- **Preconditions:** Logged in as demo.mapper.finance
- **Steps:**
  1. Navigate to /risk-analysis
- **Expected Result:** Risk analysis shows only data for users within the mapper's org unit scope.

---

### 2.10 Exports (EXP)

#### EXP-001: View Exports Page
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /exports via sidebar
- **Expected Result:** Page shows 4 standard export cards (Full Excel Report, PDF Audit Report, Provisioning CSV, SOD Exception Report) and 3 GRC Provisioning cards (SAP GRC Export, ServiceNow Export, SailPoint Export). Each card has description, format, and Download button.

#### EXP-002: Download Full Excel Report
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /exports
  2. Click Download on "Full Excel Report"
- **Expected Result:** .xlsx file downloads. Multi-sheet workbook with cover sheet, executive summary, user-persona mapping, target role mapping, full chain, SOD conflicts, gap analysis.

#### EXP-003: Download PDF Audit Report
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Click Download on "PDF Audit Report"
- **Expected Result:** .pdf file downloads with cover page, executive summary, department breakdown, persona summary, risk assessment.

#### EXP-004: Download Provisioning CSV
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Click Download on "Provisioning CSV"
- **Expected Result:** .csv file downloads with only approved assignments.

#### EXP-005: Download SOD Exception Report
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Click Download on "SOD Exception Report"
- **Expected Result:** .csv downloads with accepted SOD risks, justifications, resolved-by, timestamps.

#### EXP-006: Download SAP GRC Export
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Click Download on "SAP GRC Export"
- **Expected Result:** .csv with columns: Username, RoleID, RoleName, ValidFrom, ValidTo, Action, SystemID.

#### EXP-007: Download ServiceNow Export
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Click Download on "ServiceNow Export"
- **Expected Result:** .csv with columns: user_name, role, assignment_group, state, sys_domain.

#### EXP-008: Download SailPoint Export
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Click Download on "SailPoint Export"
- **Expected Result:** .csv with columns: identityName, applicationName, entitlementName, operation, source.

#### EXP-009: Review Link Generation (Admin)
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /exports
  2. Click "Generate Review Link" (ReviewLinkButton component)
- **Expected Result:** Shareable read-only link generated with expiration. Link URL shown or copied.

#### EXP-010: Review Link Access
- **Preconditions:** Review link generated
- **Steps:**
  1. Open the review link URL in an incognito window
- **Expected Result:** Read-only snapshot of mapping data accessible without login. Expires after set duration.

---

### 2.11 Admin Console (ADM)

#### ADM-001: Access Admin Console
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. Navigate to /admin via sidebar (under SYSTEM section)
- **Expected Result:** Config Console page loads with tabs/sections: Org Tree, Settings, and potentially other admin sections. System_admin-only sidebar items visible.

#### ADM-002: View Org Tree
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. Navigate to /admin
  2. Find org tree view
- **Expected Result:** Hierarchical tree showing L1/L2/L3 org units with user counts, assigned mapper, assigned approver. Expandable/collapsible nodes.

#### ADM-003: Edit System Settings
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. Navigate to /admin
  2. Find settings section
  3. Change "least_access_threshold" value to "50"
  4. Save
- **Expected Result:** Setting saved. Toast confirms. New threshold value reflected in provisioning alerts calculations.

#### ADM-004: Admin Console -- Non-SysAdmin Cannot Access
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /admin (Config Console)
- **Expected Result:** Page loads (admin can see /admin prefix pages). But SYSTEM sidebar section not visible for regular admin unless they navigate directly.

#### ADM-005: Admin Console -- Viewer Cannot Access
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Navigate directly to /admin via URL
- **Expected Result:** Redirected to /unauthorized.

---

### 2.12 App Users Management (USR)

#### USR-001: View App Users List
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /admin/users via sidebar (under ADMIN section)
- **Expected Result:** Table of app users with username, display name, role, email, org unit, active status.

#### USR-002: Create New App User
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /admin/users
  2. Click "Create User" button
  3. Fill in: username = "test.user", display name = "Test User", email = "test@example.com", role = "mapper", password = "StrongPass@2026!"
  4. Assign org unit
  5. Submit
- **Expected Result:** User created. Appears in list. Toast confirms.

#### USR-003: Create User -- Weak Password (Negative)
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Create user with password "short"
- **Expected Result:** Error: password must be 12+ characters with uppercase, lowercase, digit, and special character.

#### USR-004: Create User -- Duplicate Username (Negative)
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Create user with username "demo.admin" (already exists)
- **Expected Result:** Error indicating username already exists.

#### USR-005: Edit App User Role
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /admin/users
  2. Click edit on a user
  3. Change role from "mapper" to "approver"
  4. Save
- **Expected Result:** User role updated. Toast confirms.

#### USR-006: Toggle User Active Status
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Toggle active/inactive on a user
- **Expected Result:** User deactivated. Deactivated user can no longer log in.

#### USR-007: Non-Admin Cannot Access User Management
- **Preconditions:** Logged in as demo.mapper.finance
- **Steps:**
  1. Navigate directly to /admin/users
- **Expected Result:** Redirected to /unauthorized. ADMIN sidebar section not visible.

---

### 2.13 Assignments Management (ASG)

#### ASG-001: View Assignments
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /admin/assignments via sidebar
- **Expected Result:** Page shows work assignments linking app users to departments/users/org units.

---

### 2.14 Notifications -- Send Reminders (NOT)

#### NOT-001: View Send Reminders Page
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /notifications via sidebar
- **Expected Result:** Page shows Compose, Inbox (if applicable), and Sent tabs. Compose form with recipient checkboxes, type selector, subject, message. Quick message templates available.

#### NOT-002: Send Notification Using Quick Template
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /notifications
  2. Select one or more recipients via checkboxes
  3. Click a quick message template (e.g., "Mapping Pending")
  4. Verify subject and message auto-populate
  5. Click "Send"
- **Expected Result:** Notification sent. Toast confirms. Sent tab shows the notification.

#### NOT-003: Send Custom Notification
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Select recipients
  2. Choose type (Reminder/Escalation/Info)
  3. Type custom subject and message
  4. Click "Send"
- **Expected Result:** Notification sent to all selected recipients.

#### NOT-004: Bulk Select Recipients
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Click "All Mappers" or "All Approvers" bulk select
- **Expected Result:** All users with that role are checked.

#### NOT-005: Non-Admin/Non-Coordinator Cannot Send
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Look for "Send Reminders" in sidebar
- **Expected Result:** "Send Reminders" not visible in sidebar for viewer role. Direct navigation to /notifications may show read-only or empty compose.

---

### 2.15 Inbox (INB)

#### INB-001: View Inbox
- **Preconditions:** Logged in as demo.mapper.finance, notifications have been sent to this user
- **Steps:**
  1. Navigate to /inbox via sidebar
- **Expected Result:** List of received notifications. Each shows: from user, type badge, subject, message preview, timestamp, read/unread status.

#### INB-002: Mark Notification as Read
- **Preconditions:** Unread notifications exist
- **Steps:**
  1. Click on an unread notification or click "Mark Read" button
- **Expected Result:** Notification marked as read. Visual indicator changes (bold to normal, icon change).

#### INB-003: Mark All as Read
- **Preconditions:** Multiple unread notifications
- **Steps:**
  1. Click "Mark All Read" button
- **Expected Result:** All notifications marked as read.

#### INB-004: Action URL Navigation
- **Preconditions:** Notification has an actionUrl
- **Steps:**
  1. Click on the notification's action link
- **Expected Result:** Navigates to the specified page (e.g., /mapping, /sod, /approvals).

#### INB-005: Unread Badge in Sidebar
- **Preconditions:** Logged in with unread notifications
- **Steps:**
  1. Look at the sidebar "Inbox" link
- **Expected Result:** Unread count badge displayed next to "Inbox".

---

### 2.16 Audit Log (AUD)

#### AUD-001: View Audit Log
- **Preconditions:** Logged in as any authenticated user
- **Steps:**
  1. Navigate to /audit-log via sidebar
- **Expected Result:** Table of audit entries with columns: timestamp, entity type, entity ID, action, actor, old value, new value.

#### AUD-002: Filter Audit Log
- **Preconditions:** Logged in, audit entries exist
- **Steps:**
  1. Use search/filter controls to filter by entity type or action
- **Expected Result:** Table filters to matching entries.

#### AUD-003: Audit Entry After Login
- **Preconditions:** Perform a login action
- **Steps:**
  1. Navigate to /audit-log
  2. Search for "login_success"
- **Expected Result:** Entry shows the username, IP, and timestamp.

#### AUD-004: Audit Entry After Approval
- **Preconditions:** Approve an assignment
- **Steps:**
  1. Navigate to /audit-log
  2. Search for approval actions
- **Expected Result:** Entry shows the assignment ID, approver, and new status.

---

### 2.17 Navigation (NAV)

#### NAV-001: Sidebar Sections Visibility -- Admin
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Examine sidebar sections
- **Expected Result:** Visible sections: WORKFLOW (Dashboard, Releases, Data Upload, Personas, Role Mapping, SOD Analysis, Approvals, Inbox, Send Reminders), DATA (Users, Source Roles, Target Roles, SOD Rules), REPORTS (Exports, Risk Analysis, Validation, Release Comparison, Project Timeline, Audit Log), LEARN (How It Works, Platform Overview, Quick Reference), ADMIN (App Users, Assignments). Jobs link at bottom.

#### NAV-002: Sidebar Sections Visibility -- System Admin
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. Examine sidebar sections
- **Expected Result:** All sections from NAV-001 plus SYSTEM section with "Config Console".

#### NAV-003: Sidebar Sections Visibility -- Viewer
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Examine sidebar sections
- **Expected Result:** WORKFLOW section visible but without "Send Reminders". DATA and REPORTS visible. LEARN visible. ADMIN and SYSTEM sections NOT visible. Release Comparison and Project Timeline may be hidden (minRole restriction).

#### NAV-004: Sidebar Sections Visibility -- Mapper
- **Preconditions:** Logged in as demo.mapper.finance
- **Steps:**
  1. Examine sidebar sections
- **Expected Result:** Similar to viewer. "Send Reminders" NOT visible (mapper not in minRole list). ADMIN and SYSTEM sections NOT visible.

#### NAV-005: Sidebar Sections Visibility -- Coordinator
- **Preconditions:** Logged in as demo.coordinator
- **Steps:**
  1. Examine sidebar sections
- **Expected Result:** "Send Reminders" IS visible (coordinator in minRole list). ADMIN and SYSTEM sections NOT visible.

#### NAV-006: Active Link Highlighting
- **Preconditions:** Logged in, navigating between pages
- **Steps:**
  1. Click "Dashboard" -- verify it's highlighted
  2. Click "Mapping" -- verify it's highlighted and Dashboard is not
  3. Click "SOD Analysis" -- verify it's highlighted
- **Expected Result:** Current page's sidebar link has active styling (bg-slate-800, white text, indigo left border).

#### NAV-007: Brand Header
- **Preconditions:** Logged in
- **Steps:**
  1. Look at top of sidebar
- **Expected Result:** Shows Provisum logo (teal shield icon), "Provisum" text, "Intelligent Role Mapping" subtitle. Clicking it navigates to /dashboard.

#### NAV-008: User Section in Sidebar
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Look at bottom of sidebar
- **Expected Result:** Shows user avatar (initials), display name, role label, "Provisum v0.6.0" text.

#### NAV-009: All Sidebar Links Navigate Correctly
- **Preconditions:** Logged in as sysadmin (highest access)
- **Steps:**
  1. Click every sidebar link in order
  2. Verify each page loads without error
- **Expected Result:** Every link navigates to the correct page. No 404s, no errors, no blank pages.

#### NAV-010: Loading State
- **Preconditions:** Logged in
- **Steps:**
  1. Click on a page (observe during load)
- **Expected Result:** Loading indicator shown (if applicable) while page data fetches.

---

### 2.18 Data Pages (DAT)

#### DAT-001: Users Page
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /users via sidebar
- **Expected Result:** Table of source system users with ID, name, email, department, job title. Rows are clickable. Search/filter available.

#### DAT-002: Source Roles Page
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /source-roles
- **Expected Result:** Table of legacy roles with role ID, name, description, system, domain.

#### DAT-003: Target Roles Page
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /target-roles
- **Expected Result:** Table of target system roles with role ID, name, description, system, domain.

#### DAT-004: SOD Rules Page
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /sod-rules
- **Expected Result:** Table of SOD rules with rule ID, name, permission A, permission B, severity, active status.

#### DAT-005: User Detail Click-Through
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /users
  2. Click on a user row
- **Expected Result:** Navigates to user detail page showing source attributes, persona assignment, target role assignments, permission gaps.

---

### 2.19 Public Pages (PUB)

#### PUB-001: Landing Page
- **Preconditions:** Not logged in
- **Steps:**
  1. Navigate to https://demo.provisum.io/
- **Expected Result:** Landing page with hero section, feature cards, footer. Provisum branding. Navigation to /login available.

#### PUB-002: Methodology Page
- **Preconditions:** Not logged in or logged in
- **Steps:**
  1. Navigate to /methodology
- **Expected Result:** "How It Works" page explaining the role mapping methodology. Accessible without login.

#### PUB-003: Platform Overview Page
- **Preconditions:** Not logged in or logged in
- **Steps:**
  1. Navigate to /overview
- **Expected Result:** Platform overview page. Accessible without login.

#### PUB-004: Quick Reference Page
- **Preconditions:** Not logged in or logged in
- **Steps:**
  1. Navigate to /quick-reference
- **Expected Result:** Quick reference guide. Accessible without login.

#### PUB-005: Health Check Endpoint
- **Preconditions:** None
- **Steps:**
  1. Navigate to /api/health
- **Expected Result:** JSON response: `{"status":"ok","components":{"database":"connected"}}`.

#### PUB-006: 404 Page
- **Preconditions:** Logged in or not
- **Steps:**
  1. Navigate to /nonexistent-page
- **Expected Result:** Branded 404 page with Provisum styling and "Go to Dashboard" button (or "Go to Login" if not authenticated).

#### PUB-007: Setup Page Redirect
- **Preconditions:** App users exist in database
- **Steps:**
  1. Navigate to /setup
- **Expected Result:** Since users exist, should redirect or show appropriate message. Setup only works on fresh install.

---

### 2.20 Pipeline Validation (VAL)

#### VAL-001: Access Validation Dashboard
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. Navigate to /admin/validation via sidebar (under REPORTS section)
- **Expected Result:** Validation dashboard with Overview, Users, and Personas tabs. Pipeline flow visualization, stat cards, distribution charts.

#### VAL-002: Overview Tab
- **Preconditions:** Logged in as sysadmin, full pipeline has been run
- **Steps:**
  1. Click Overview tab
- **Expected Result:** Pipeline flow (users -> personas -> roles -> SOD), stat cards, persona distribution chart, confidence histogram, status breakdown, edge case panel.

#### VAL-003: Users Tab -- Search and Filter
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. Click Users tab
  2. Search by user name
  3. Filter by department, persona, edge case category
- **Expected Result:** Table filters to matching results. Each row shows user with full attribution chain metadata.

#### VAL-004: User Detail Modal
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. On Users tab, click a user row
- **Expected Result:** Modal opens showing complete attribution chain: source attributes -> persona (with AI reasoning + confidence) -> target roles (with status) -> SOD conflicts.

#### VAL-005: Edge Case Detection
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. On Users tab, filter by edge case category (no persona, low confidence, high SOD, complex user)
- **Expected Result:** Only users matching the selected edge case shown.

#### VAL-006: Personas Tab
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. Click Personas tab
- **Expected Result:** Per-persona cards with user counts, confidence stats, mapped target roles.

#### VAL-007: Export Validation Excel
- **Preconditions:** Logged in as sysadmin
- **Steps:**
  1. Click export button on validation dashboard
- **Expected Result:** 5-tab XLSX downloads: Validation Summary, Full Attribution Chain, Persona Distribution, SOD Conflicts, Methodology.

#### VAL-008: Non-SysAdmin Cannot Access
- **Preconditions:** Logged in as demo.admin (regular admin)
- **Steps:**
  1. Navigate to /admin/validation
- **Expected Result:** Page loads (admin can access /admin prefix) or content restricted. System_admin restriction may be enforced at component level.

---

### 2.21 Jobs (JOB)

#### JOB-001: View Jobs Page
- **Preconditions:** Logged in as any user
- **Steps:**
  1. Navigate to /jobs via sidebar
- **Expected Result:** List of processing jobs with job type, status, started at, completed at, records processed. Running jobs show spinner.

#### JOB-002: Job Status Polling
- **Preconditions:** Logged in as demo.admin, trigger a persona generation job
- **Steps:**
  1. Navigate to /personas and start generation
  2. Navigate to /jobs
  3. Observe the running job
- **Expected Result:** Job shows "running" status. Automatically updates to "completed" or "failed" when done.

#### JOB-003: Viewer Sees Status Badges Only
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Navigate to /jobs
- **Expected Result:** Jobs shown with status badges (Done/Running/Pending) but no "Run" buttons.

---

### 2.22 Security (SEC)

#### SEC-001: Security Headers Present
- **Preconditions:** None
- **Steps:**
  1. Open browser dev tools, Network tab
  2. Navigate to any page
  3. Inspect response headers
- **Expected Result:** Headers present: X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: camera=(), microphone=(), geolocation=(), X-XSS-Protection: 1; mode=block, Content-Security-Policy (with default-src 'self', frame-ancestors 'none').

#### SEC-002: HSTS Header in Production
- **Preconditions:** Access production URL
- **Steps:**
  1. Inspect response headers
- **Expected Result:** Strict-Transport-Security: max-age=31536000; includeSubDomains.

#### SEC-003: CSP Blocks Inline Scripts (Partial)
- **Preconditions:** None
- **Steps:**
  1. Inspect CSP header
- **Expected Result:** script-src includes 'self' and 'unsafe-inline' (required for Next.js hydration). Does NOT include 'unsafe-eval' in production.

#### SEC-004: Direct API Access Without Auth
- **Preconditions:** Not logged in (clear cookies)
- **Steps:**
  1. Call GET /api/settings directly (or any protected API)
  2. Call POST /api/ai/persona-generation without auth cookie
- **Expected Result:** 401 Unauthorized response. No data leaked.

#### SEC-005: API Role Enforcement
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Using browser console or curl, POST to /api/ai/persona-generation
- **Expected Result:** 403 Forbidden ("Insufficient permissions").

#### SEC-006: Rate Limiting on AI Endpoints
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Send 11+ rapid POST requests to /api/ai/persona-generation
- **Expected Result:** After rate limit threshold (10/min), requests return 429 Too Many Requests.

#### SEC-007: Supabase JWT Validation
- **Preconditions:** None
- **Steps:**
  1. Send a request to a protected route with a forged/expired JWT cookie
- **Expected Result:** Redirected to /login. No data access.

#### SEC-008: Frame Embedding Prevention
- **Preconditions:** None
- **Steps:**
  1. Create an HTML page with `<iframe src="https://demo.provisum.io/dashboard">`
  2. Open in browser
- **Expected Result:** iframe refuses to load (X-Frame-Options: DENY, CSP frame-ancestors: 'none').

---

### 2.23 Release Comparison & Timeline (RCT)

#### RCT-001: Release Comparison Page
- **Preconditions:** Logged in as demo.admin, multiple releases exist
- **Steps:**
  1. Navigate to /releases/compare via sidebar
- **Expected Result:** Side-by-side comparison of releases showing assignment counts, approval rates, SOD conflicts.

#### RCT-002: Project Timeline Page
- **Preconditions:** Logged in as demo.admin
- **Steps:**
  1. Navigate to /releases/timeline via sidebar
- **Expected Result:** Timeline visualization of releases with deadlines, milestones.

#### RCT-003: Non-Admin Cannot See These Links
- **Preconditions:** Logged in as demo.viewer
- **Steps:**
  1. Check sidebar for "Release Comparison" and "Project Timeline"
- **Expected Result:** These links are not visible (minRole restriction to admin, system_admin, project_manager).

---

## 3. Role-Based Access Matrix

| Feature/Action | system_admin | admin | approver | coordinator | mapper | viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Login** | Y | Y | Y | Y | Y | Y |
| **View Dashboard** | Y | Y | Y | Y | Y | Y |
| **Dashboard Scope** | All | All | All | Org unit | Org unit | All |
| **View Releases** | Y | Y | Y | Y | Y | Y |
| **Create/Edit/Delete Releases** | Y | Y | N | N | N | N |
| **Data Upload** | Y | Y | N | N | N | View only |
| **View Personas** | Y | Y | Y | Y | Y | Y |
| **Generate Personas** | Y | Y | N | N | Y | N |
| **Delete Personas (Bulk)** | Y | Y | N | N | N | N |
| **View Mapping** | Y | Y | Y | Y | Y | Y |
| **Auto-Map Roles** | Y | Y | N | N | Y | N |
| **Edit Role Assignments** | Y | Y | N | N | Y | N |
| **Submit for Review** | Y | Y | N | N | Y | N |
| **View SOD Analysis** | Y | Y | Y | Y | Y | Y |
| **Run SOD Analysis** | Y | Y | N | N | Y | N |
| **Fix Mapping (SOD)** | Y | Y | N | N | Y | N |
| **Accept Risk (SOD)** | Y | Y | Y | N | N | N |
| **Escalate SOD** | Y | Y | Y | N | N | N |
| **See Within-Role SOD** | Y | Y | Y | N | security.lead only | N |
| **View Approvals** | Y | Y | Y | Y | Y | Y |
| **Approve Assignments** | Y | Y | Y | N | N | N |
| **Send Back Assignments** | Y | Y | Y | N | Y | N |
| **Bulk Approve** | Y | Y | Y | N | N | N |
| **View Risk Analysis** | Y | Y | Y | Y | Y | Y |
| **View Exports** | Y | Y | Y | Y | Y | Y |
| **Download Exports** | Y | Y | Y | Y | Y | Y |
| **Generate Review Link** | Y | Y | N | N | N | N |
| **View Admin Console** | Y | N* | N | N | N | N |
| **App Users CRUD** | Y | Y | N | N | N | N |
| **Assignments Management** | Y | Y | N | N | N | N |
| **Send Notifications** | Y | Y | N | Y | N | N |
| **View Inbox** | Y | Y | Y | Y | Y | Y |
| **View Audit Log** | Y | Y | Y | Y | Y | Y |
| **Pipeline Validation** | Y | N* | N | N | N | N |
| **Validation Export** | Y | N* | N | N | N | N |
| **Accept Provisioning Exception** | Y | Y | Y | N | N | N |
| **View Data Pages** | Y | Y | Y | Y | Y | Y |
| **View Public Pages** | Y | Y | Y | Y | Y | Y |
| **Release Comparison/Timeline** | Y | Y | N | N | N | N |
| **View Jobs** | Y | Y | Y | Y | Y | Y (badges only) |

*N\* = May have partial access via /admin prefix but SYSTEM sidebar section not shown.*

---

## 4. Negative Testing

### 4.1 Invalid Inputs

| ID | Test | Steps | Expected |
|---|---|---|---|
| NEG-001 | Empty username login | Submit login with blank username | Validation error |
| NEG-002 | SQL injection in login | Username: `' OR 1=1 --` | "Invalid credentials" (parameterized queries prevent injection) |
| NEG-003 | XSS in notification subject | Send notification with subject `<script>alert('xss')</script>` | Script not executed; text shown safely escaped |
| NEG-004 | XSS in release name | Create release with name `<img src=x onerror=alert(1)>` | HTML escaped; no script execution |
| NEG-005 | Oversized CSV upload | Upload a 100MB CSV file | Error or timeout; no server crash |
| NEG-006 | CSV with wrong delimiter | Upload tab-delimited file as CSV | Error about invalid format or columns not found |
| NEG-007 | Empty CSV upload | Upload CSV with headers only, no data rows | Handled gracefully; "0 records imported" or similar |
| NEG-008 | Duplicate data upload | Upload same users CSV twice | Handles upsert/conflict resolution or shows duplicate error |
| NEG-009 | Special characters in persona name | Generate personas with users containing special chars (unicode, etc.) | Personas generated without error; names display correctly |
| NEG-010 | Concurrent SOD analysis | Trigger SOD analysis from two browser tabs simultaneously | Both jobs complete or second is rejected; no corrupt data |
| NEG-011 | Approve already-approved assignment | POST /api/approvals/approve with an already-approved ID | No-op or "already approved" message; not double-approved |
| NEG-012 | Send notification to self | Select own user as recipient | Should be allowed or gracefully prevented |
| NEG-013 | Release with past target date | Create release with target date in the past | Allowed (for backfill); displayed correctly |
| NEG-014 | Very long text in justification | Enter 10,000 chars in SOD risk justification | Either truncated, stored, or max-length enforced |
| NEG-015 | Navigate to persona detail with invalid ID | Navigate to /personas/99999 | 404 or "not found" page |

### 4.2 Boundary Conditions

| ID | Test | Expected |
|---|---|---|
| BND-001 | Dashboard with 0 users | KPI cards show 0. Workflow stepper shows "not_started" everywhere. |
| BND-002 | Dashboard with 1 user | Numbers show correctly; no division-by-zero errors |
| BND-003 | Approval queue with 0 items | Empty state message shown |
| BND-004 | SOD analysis with 0 rules | Message "SOD ruleset not uploaded" or skip analysis |
| BND-005 | Export with 0 approved assignments | Provisioning CSV downloads empty or shows "0 approved" message |
| BND-006 | Mapping with 0 target roles | Auto-map cannot proceed; appropriate message shown |
| BND-007 | 100% approval rate | Dashboard shows 100% approved, Workflow stepper shows all complete |

### 4.3 Error Handling

| ID | Test | Expected |
|---|---|---|
| ERR-001 | AI API key invalid/missing | Persona generation fails gracefully; job marked "failed" with error message |
| ERR-002 | Database connection lost (simulate) | /api/health returns unhealthy status; pages show error state |
| ERR-003 | Network timeout during auto-map | Job continues in background (fire-and-forget); client can poll for status later |
| ERR-004 | Browser back button after action | Previous page state correct; no double-submit |

---

## 5. Cowork Prompt

The following prompt is designed to be pasted directly into Cowork (or any AI browser-testing agent) to execute the test plan against the live application.

---

```
You are a QA tester for Provisum, an enterprise role mapping application deployed at https://demo.provisum.io. Execute the following comprehensive test plan.

## Application Context
Provisum is a Next.js 14 web application for managing SAP ECC to S/4HANA role migrations. It supports: data upload, AI persona generation, role mapping, SOD (Segregation of Duties) conflict analysis, approval workflows, risk analysis, exports, notifications, and admin configuration. The app uses Supabase Auth for authentication with JWT cookies.

## Test Accounts
| Username | Password | Role | Scope |
|---|---|---|---|
| demo.admin | DemoGuide2026! | admin | All data |
| demo.mapper.finance | DemoGuide2026! | mapper | Finance org unit |
| demo.mapper.operations | DemoGuide2026! | mapper | Operations org unit |
| demo.approver | DemoGuide2026! | approver | All data |
| demo.viewer | DemoGuide2026! | viewer | All data (read-only) |
| demo.coordinator | DemoGuide2026! | coordinator | Assigned org unit |
| sysadmin | Sysadmin@2026! | system_admin | All data + system config |

## Test Execution Instructions

### Phase 1: Authentication & Navigation
1. Go to https://demo.provisum.io/login
2. Verify the login page shows Provisum branding (left panel on desktop: teal shield icon, "Provisum" text, "Intelligent Role Mapping" subtitle)
3. Verify quick-login pill buttons are shown for demo accounts
4. Click the "demo.admin" pill button and verify the username field is populated
5. Enter password "DemoGuide2026!" and click "Sign In"
6. Verify redirect to /dashboard
7. Verify the sidebar shows: WORKFLOW section (Dashboard, Releases, Data Upload, Personas, Role Mapping, SOD Analysis, Approvals, Inbox, Send Reminders), DATA section (Users, Source Roles, Target Roles, SOD Rules), REPORTS section (Exports, Risk Analysis, Validation, Release Comparison, Project Timeline, Audit Log), LEARN section (How It Works, Platform Overview, Quick Reference), ADMIN section (App Users, Assignments)
8. Verify sidebar bottom shows user initials, "Demo Admin" name, "Admin" role, "Provisum v0.6.0"
9. Click every sidebar link and verify each page loads without errors. Note any 404s or blank pages.
10. Log out and test login with wrong password -- verify "Invalid credentials" error
11. Verify the error clears when you start typing again

### Phase 2: Dashboard Verification (as demo.admin)
1. Navigate to /dashboard
2. Verify the Workflow Stepper is visible with 5 stages (Upload, Personas, Mapping, SOD Analysis, Approval)
3. Verify a colored strapline banner is shown below the stepper
4. Verify 5 KPI cards are shown: Total Users, Personas Generated, Persona Coverage, Mapped to Roles, Approved
5. Note each KPI value for cross-referencing later
6. Check for Risk Quantification section (3 cards: Business Continuity, Adoption Risk, Incorrect Access)
7. Check the Department Mapping Progress section -- verify the department dropdown works and filters the kanban grid
8. Check the Attention Required card for SOD conflicts, low confidence, etc.
9. Check for Provisioning Alerts section (if present)
10. Check Source Systems card at bottom

### Phase 3: Full Workflow Test (as demo.admin)
1. Navigate to /releases -- verify release cards with status, progress bars, stats
2. If no releases exist, create one: click "New Release", name it "QA Test Wave", set status "In Progress", set as active
3. Navigate to /upload -- verify all upload sections are visible with counts
4. Navigate to /personas -- if no personas, click "Generate Personas" and wait for completion
5. After personas exist, navigate to /mapping -- verify persona list on left, mapping area on right
6. Click "Auto-Map" and wait for completion (or verify existing mappings)
7. Navigate to /sod -- verify summary cards. Click "Run Analysis" if not yet run
8. Navigate to /approvals -- verify the approval queue with assignment counts
9. If any assignments are in approvable state, approve one and verify status change
10. Navigate to /risk-analysis -- verify 3 risk category cards and flagged users table
11. Navigate to /exports -- verify all 7 export cards. Download the "Full Excel Report" and verify it opens as a multi-sheet workbook

### Phase 4: Role-Based Access Testing
For each of these accounts, log in and verify:

**demo.viewer (viewer):**
- Dashboard loads but no action buttons for pipeline operations
- /upload shows "View only" banner, no upload buttons
- /personas -- no "Generate" button
- /mapping -- no "Auto-Map" button, no edit capability
- /sod -- no "Run Analysis" button
- /approvals -- no Approve/Reject/Send Back buttons
- Sidebar does NOT show: ADMIN section, SYSTEM section, "Send Reminders"
- Navigate to /admin/users directly -- should redirect to /unauthorized

**demo.mapper.finance (mapper):**
- Dashboard shows scoped data for Finance department
- Can see "Generate Personas" and "Auto-Map" buttons
- Can edit role assignments on mapping page
- Cannot approve assignments (no Approve button)
- Can "Send Back" assignments
- Sidebar does NOT show: ADMIN section, SYSTEM section, "Send Reminders"

**demo.approver (approver):**
- Can approve and send back assignments
- Cannot run AI pipeline operations (no Generate/Auto-Map/Run SOD buttons)
- Can accept SOD risk

**demo.coordinator (coordinator):**
- View-only for most features
- CAN see "Send Reminders" in sidebar
- Cannot approve, cannot edit mappings
- Data scoped to assigned org unit

**sysadmin (system_admin):**
- All features accessible
- SYSTEM section visible in sidebar with "Config Console"
- /admin/validation accessible
- Can see and edit system settings

### Phase 5: Negative Testing
1. Try logging in with empty fields -- verify error
2. Try logging in with wrong password 3 times -- verify error messages
3. Navigate to /api/health without auth -- verify it returns JSON with status "ok"
4. Navigate to /api/settings without auth -- verify 401
5. Navigate to /nonexistent-page -- verify branded 404 page
6. Open browser dev tools, check response headers for security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, Content-Security-Policy

### Phase 6: Public Pages
1. Log out completely
2. Navigate to https://demo.provisum.io/ -- verify landing page loads
3. Navigate to /methodology -- verify it loads without login
4. Navigate to /overview -- verify it loads without login
5. Navigate to /quick-reference -- verify it loads without login
6. Navigate to /dashboard -- verify redirect to /login

## Reporting Format
For each test, report:
- PASS / FAIL / BLOCKED
- Screenshot or description of any failures
- Any unexpected behavior (even if technically passing)
- Performance issues (pages taking >3s to load)

Focus on: data accuracy, role enforcement, navigation completeness, error handling, and visual presentation. This is for an acquisition demo -- every page must look polished and function correctly.
```

---

*End of QA Testing Strategy Document*
