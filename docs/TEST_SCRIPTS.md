# AIRM Manual Test Scripts

Step-by-step QA scripts for verifying all major workflows. Run after each significant change or before a demo. All tests assume the default seeded dataset.

**Default credentials (seeded):** `admin` / `admin123`

---

## Prerequisites

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

App runs at `http://localhost:3000`. Browser should redirect to `/login` on first visit.

---

## 1. Authentication

### 1.1 — Login flow

1. Visit `http://localhost:3000`
2. **Expected:** Redirect to `/login`
3. Enter incorrect credentials → click Login
4. **Expected:** Error message shown, stay on login page
5. Enter `admin` / `admin123` → click Login
6. **Expected:** Redirect to `/dashboard`
7. Verify header shows username "admin" and role badge "Admin"

### 1.2 — Session persistence

1. Log in as admin
2. Close and reopen the browser tab
3. **Expected:** Session persists, no re-login required (24h cookie)

### 1.3 — Logout

1. Log in as admin
2. Click logout in the header
3. **Expected:** Redirect to `/login`, cookie cleared
4. Attempt to navigate to `/dashboard` directly
5. **Expected:** Redirect to `/login`

### 1.4 — First-run setup (blank DB only)

*Run only against a fresh database with no app_users rows.*

1. Visit `http://localhost:3000/setup`
2. Fill in username, display name, password
3. **Expected:** Redirect to `/login`
4. Log in with new credentials
5. **Expected:** Admin dashboard visible
6. **Expected:** `/setup` now redirects to `/dashboard` (setup page blocks once an admin exists)

### 1.5 — Unauthorised access

1. Log in as a mapper account (create one first if needed)
2. Navigate directly to `/admin/users`
3. **Expected:** Redirect to `/unauthorized`

---

## 2. Role-based access & sidebar

### 2.1 — Admin sidebar

Log in as `admin`:
- **Expected nav items:** Dashboard, Status, Personas, Mapping, Approvals, Notifications, Releases, Admin (Users, Assignments, Console)
- **Expected NOT visible:** Legacy Access Browser, Least Access (removed)

### 2.2 — Mapper sidebar

Log in as a mapper account:
- **Expected:** Dashboard, Status, Mapping, Notifications
- **Expected NOT visible:** Approvals, Admin section, Releases

### 2.3 — Approver sidebar

Log in as an approver account:
- **Expected:** Dashboard, Status, Approvals, Notifications
- **Expected NOT visible:** Mapping, Admin section

### 2.4 — Coordinator sidebar

Log in as a coordinator account:
- **Expected:** Dashboard, Status, Notifications (read-only access to personas, mappings, approvals)
- **Expected NOT visible:** Admin section

---

## 3. Dashboard

### 3.1 — KPI cards (admin)

1. Log in as admin → navigate to `/dashboard`
2. **Expected:** 5 KPI cards visible: Users, Personas, Coverage %, Mapped, Approved
3. Values match the seeded dataset totals

### 3.2 — Strapline banner

1. Log in as admin → view dashboard
2. **Expected:** Coloured banner below header with action-oriented text
3. Banner colour reflects current project state:
   - Emerald = mostly complete
   - Orange = action required (most common with fresh seed)
   - Yellow = warning / attention
   - Blue = informational
4. Text names a specific bottleneck (e.g. "Mapping is lagging — X personas need target role assignments")
5. Log in as a mapper → navigate to dashboard
6. **Expected:** Area-scoped strapline reflecting mapper's workload, not the whole project

### 3.3 — Attention Required card

1. Log in as admin → view dashboard
2. **Expected:** "Attention Required" card shows SOD conflict count and low-confidence persona count
3. If `overprovisioningAlerts` exist: count shown ("X provisioning alerts pending")

### 3.4 — Provisioning Alerts card (admin)

1. Log in as admin → view dashboard
2. If any personas have `excessPercent` above the threshold (default 30%):
   - **Expected:** "Provisioning Alerts" card visible below Attention Required
   - **Expected:** Scrollable list of persona → role pairings with excess % badge
3. Click "Revoke" on an alert without an existing exception
4. **Expected:** Alert removed from list (page refreshes), revoke confirmed
5. Click "Accept Exception" on an alert
6. **Expected:** Justification textarea + Confirm/Cancel buttons appear inline
7. Enter justification text → click Confirm
8. **Expected:** Alert shows "Accepted" status, Revoke button available
9. Revoke the accepted exception
10. **Expected:** Alert returns to pending state

### 3.5 — Provisioning Alerts scoping (mapper/approver)

1. Create a mapper assigned to the "Finance" org unit
2. Log in as that mapper → view dashboard
3. **Expected:** Provisioning Alerts card shows only Finance-scoped alerts (or is hidden if none)
4. **Expected:** Admin dashboard still shows all alerts

### 3.6 — Department kanban

1. Log in as admin → view dashboard
2. **Expected:** Department grid showing stage breakdown per department (Not Started / In Progress / Complete)
3. Scroll to verify all seeded departments visible

---

## 4. Mapping

### 4.1 — Mapper scope

1. Log in as a mapper assigned to "Finance" org unit
2. Navigate to `/mapping`
3. **Expected:** Only Finance department personas visible
4. No other department's personas shown

### 4.2 — Assign target role

1. Log in as admin → `/mapping`
2. Select an unmapped persona
3. Click "Add Role" → select a target role from the dropdown
4. **Expected:** Role chip appears, coverage % updates
5. Confidence score and AI reasoning visible if populated

### 4.3 — Over-provisioning badge

1. Find a persona with `excessPercent` ≥ threshold (check admin console for threshold value, default 30%)
2. **Expected:** Orange badge on the role chip showing excess %
3. Banner at top of mapping page: "X personas have over-provisioned roles — View Provisioning Alerts on dashboard"
4. Click link → **Expected:** Navigate to `/dashboard`

### 4.4 — Remove role mapping

1. Log in as admin → `/mapping`
2. Remove an existing role assignment from a persona
3. **Expected:** Role chip removed, coverage % recalculates

---

## 5. SOD Analysis

### 5.1 — Conflict list

1. Log in as admin → `/sod`
2. **Expected:** List of SOD conflicts derived from rulebook
3. Conflicts show severity (Critical / High / Medium / Low)
4. Filter by severity → list updates

### 5.2 — Conflict resolution

1. Open a conflict → click "Resolve"
2. Enter resolution notes
3. **Expected:** Conflict marked as resolved, moves to resolved tab
4. Unresolved count in "Attention Required" card on dashboard decreases

### 5.3 — SOD in Attention Required

1. Log in as admin → `/dashboard`
2. **Expected:** Attention Required card shows current unresolved SOD conflict count

---

## 6. Approvals

### 6.1 — Approver scope

1. Create an approver assigned to "HR" org unit
2. Log in as that approver → `/approvals`
3. **Expected:** Only HR persona assignments visible in the queue
4. No other department's assignments shown

### 6.2 — Approve assignment

1. Log in as admin → `/approvals`
2. Find an assignment with status "Ready for Approval"
3. Click "Approve"
4. **Expected:** Status changes to "Approved", `approvedBy` field shows logged-in username
5. Dashboard approval KPI count increases

### 6.3 — Reject assignment

1. Find an assignment with status "Ready for Approval"
2. Click "Reject" → enter rejection reason
3. **Expected:** Status changes to "Rejected", `rejectedBy` field shows username

### 6.4 — Approval blocked by SOD

1. Find an assignment with an active SOD conflict
2. **Expected:** "Approve" button disabled or warning shown
3. Resolve the SOD conflict → return to approvals
4. **Expected:** Assignment can now be approved

---

## 7. Notifications

### 7.1 — Compose (coordinator/admin)

1. Log in as admin → `/notifications`
2. Click Compose tab
3. Select recipients (individual or "All Mappers")
4. Select notification type (Reminder / Escalation / Info)
5. Enter subject and message body
6. Click Send
7. **Expected:** Success toast, message visible in Sent tab

### 7.2 — Inbox (recipient)

1. Log in as a mapper who was sent a notification
2. Navigate to `/notifications`
3. **Expected:** Notification visible in Inbox with unread badge
4. Click to open → **Expected:** Message body visible, marked as read
5. Unread badge disappears

### 7.3 — Quick message templates

1. Log in as admin → Compose tab
2. Click a quick message button (e.g. "Mapping Pending")
3. **Expected:** Subject and body pre-populated with template text
4. Template references "Provisioning Alerts section on the dashboard" (not "Least Access page")

### 7.4 — Viewer cannot compose

1. Log in as a viewer account
2. Navigate to `/notifications`
3. **Expected:** Only Inbox tab visible, no Compose or Sent tabs

---

## 8. Admin — User Management

### 8.1 — Create new user

1. Log in as admin → `/admin/users`
2. Click "New User"
3. Fill in username, display name, password, role, org unit
4. **Expected:** User appears in list with correct role badge
5. Log in as new user → verify correct sidebar and scoping

### 8.2 — Edit role

1. In `/admin/users`, click edit on an existing user
2. Change role from mapper to approver
3. **Expected:** Role badge updates, new role reflected on next login

### 8.3 — Deactivate user

1. Toggle a user's active status to inactive
2. **Expected:** User badge shows "Inactive"
3. Attempt to log in as that user
4. **Expected:** Login rejected with error

### 8.4 — Role hierarchy enforcement

Verify that the seeded roles can be created for all 6 levels:
- `system_admin`, `admin`, `approver`, `coordinator`, `mapper`, `viewer`

---

## 9. Admin — Settings Console

### 9.1 — Change provisioning threshold

1. Log in as admin → `/admin/console`
2. Find `least_access_threshold` setting
3. Change value from `30` to `50` → save
4. Navigate to dashboard
5. **Expected:** Provisioning Alerts card now shows fewer alerts (higher threshold = fewer flagged)
6. Reset back to `30`

### 9.2 — Project name / release settings

1. Update `project_name` setting
2. **Expected:** Title or header reflects new name

---

## 10. Releases

### 10.1 — Create release

1. Log in as admin → `/releases`
2. Click "New Release"
3. Enter name, description, scope (all users or specific department)
4. **Expected:** Release appears in list

### 10.2 — Release scoping

1. Assign a release to "Finance" department
2. Navigate to mapping → verify only Finance users appear in context of that release

---

## 11. Exports

### 11.1 — CSV provisioning export

1. Log in as admin → navigate to export section
2. Click "Export CSV"
3. **Expected:** Download starts, file contains user-persona-role mappings

### 11.2 — Excel export

1. Click "Export Excel"
2. **Expected:** `.xlsx` file downloaded with multiple sheets

---

## 12. Build & Deployment

### 12.1 — Production build

```bash
pnpm build
```

**Expected:** Build completes with no TypeScript errors and no missing module errors.

Common failures to check:
- `inArray` with null values (filter nulls first)
- `force-dynamic` missing on pages that read from DB
- Unused imports left by edits

### 12.2 — Render startup script (local simulation)

```bash
DATABASE_PATH=./data/airm.db sh scripts/start.sh
```

**Expected output (first run):**
```
[AIRM] Pushing database schema...
[AIRM] Checking initialisation status...
[AIRM] First run — seeding database...
[AIRM] Starting server...
```

**Expected output (subsequent runs):**
```
[AIRM] Pushing database schema...
[AIRM] Checking initialisation status...
[AIRM] Database already initialised, skipping seed.
[AIRM] Starting server...
```

### 12.3 — DATABASE_PATH env var

```bash
DATABASE_PATH=/tmp/test-airm.db pnpm dev
```

**Expected:** App starts, SQLite file created at `/tmp/test-airm.db` (not `./data/airm.db`).

---

## 13. Regression checklist

Run after any major change to verify nothing regressed:

| Check | Pass? |
|-------|-------|
| `/login` redirects unauthenticated users | |
| Admin can see all departments in dashboard | |
| Mapper only sees their scoped department in Mapping | |
| Approver only sees their scoped department in Approvals | |
| Provisioning Alerts card scoped correctly per role | |
| Strapline shows on dashboard for all roles | |
| Strapline text is action-oriented (not just metric numbers) | |
| "Least Access" does not appear anywhere in the UI (renamed) | |
| "Legacy Access Browser" not in sidebar | |
| Notifications send/receive for mapper ↔ coordinator | |
| `pnpm build` completes without errors | |
| `scripts/start.sh` seeds only on first run | |

---

## Known demo data

The seed script creates the following accounts. Use these for role-switching during demos:

| Username | Password | Role | Org Unit |
|----------|----------|------|----------|
| `admin` | `admin123` | Admin | (all) |

*Additional accounts must be created manually via `/admin/users` after first login.*

Departments seeded: Finance, HR, Operations, IT, Sales (exact names depend on the source data CSV used).
