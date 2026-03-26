# Provisum v0.6.0 — End-to-End Test Scripts

**URL:** https://airm-npt8.onrender.com
**Total test cases:** 186 across 18 suites
**Coverage:** Every page, every persona, every action button, every form, every role gate

---

## Suite 1: Public Pages (No Auth Required) — 12 tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.1 | Landing page loads | Navigate to `/` | Hero with "Provisum" heading, 3 feature cards, footer with copyright |
| 1.2 | Sign In button navigates | Click "Sign In" on landing | Navigates to `/login` |
| 1.3 | Learn More navigates | Click "Learn More" on landing | Navigates to `/methodology` |
| 1.4 | Methodology page | Navigate to `/methodology` | 6 workflow step cards + 4 principles section, nav bar visible |
| 1.5 | Overview page | Navigate to `/overview` | Capabilities, architecture, security sections, nav bar visible |
| 1.6 | Login page renders | Navigate to `/login` | Sign In form, Demo Environment dropdown, demo credential pills |
| 1.7 | Quick Reference page | Navigate to `/quick-reference` | Quick reference content loads |
| 1.8 | Nav bar on public pages | Check `/methodology`, `/overview` | Provisum logo + nav links (How It Works, Overview, Sign In) visible |
| 1.9 | 404 page | Navigate to `/nonexistent` | Branded 404 with Provisum styling and "Go to Dashboard" button |
| 1.10 | Health endpoint | `GET /api/health` | Returns 200 with `{ status: "ok", db: "connected" }` |
| 1.11 | Auth redirect | Navigate to `/dashboard` without session | Redirects to `/login` |
| 1.12 | Demo env dropdown | Click demo environment dropdown on login | Shows all 9+ environments |

---

## Suite 2: Login & Authentication — 16 tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1 | Valid login (admin) | Username: `admin`, Password: `AdminPass@2026!` | Redirects to `/dashboard`, session cookie set |
| 2.2 | Valid login (sysadmin) | Username: `sysadmin`, Password: `Sysadmin@2026!` | Redirects to `/dashboard` |
| 2.3 | Valid login (mapper) | Username: `mapper.finance`, Password: `Provisum@2026!` | Redirects to `/dashboard`, scoped to Finance |
| 2.4 | Valid login (approver) | Username: `approver.finance`, Password: `Provisum@2026!` | Redirects to `/dashboard` |
| 2.5 | Valid login (viewer) | Username: `viewer`, Password: `Provisum@2026!` | Redirects to `/dashboard` |
| 2.6 | Valid login (demo.admin) | Username: `demo.admin`, Password: `DemoGuide2026!` | Redirects to `/dashboard` |
| 2.7 | Invalid password | Username: `admin`, Password: `wrong` | "Invalid credentials" error shown |
| 2.8 | Invalid username | Username: `nonexistent`, Password: `test` | "Invalid credentials" error shown |
| 2.9 | Error clears on input | After failed login, type in username field | Error message disappears |
| 2.10 | Account lockout | Fail login 5 times for same username | "Account locked" message with retry time |
| 2.11 | Lockout is per-account | Lock `admin`, then login as `mapper.finance` | mapper.finance login succeeds |
| 2.12 | Demo pill buttons | Click "Admin" pill on login page | Username and password auto-filled |
| 2.13 | Sign In button color | View login page | Sign In button is teal (not purple/lavender) |
| 2.14 | Logout | Click logout from sidebar | Redirects to `/login`, session cleared |
| 2.15 | Session persistence | Login, close tab, reopen `/dashboard` | Still authenticated (cookie valid) |
| 2.16 | Password change | Login as admin, change password via API | New password works, old password rejected |

---

## Suite 3: System Admin (sysadmin) — 14 tests

**Login:** `sysadmin` / `Sysadmin@2026!`

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1 | Full sidebar visible | Check sidebar nav | All sections: Workflow, Data, Reports, Learn, Admin, System, Jobs |
| 3.2 | Config Console access | Navigate to `/admin` | Config Console loads with settings tabs |
| 3.3 | App Users page | Navigate to `/admin/users` | User list with Create, Edit, Delete buttons |
| 3.4 | Create user (strong pw) | Create user with password `Test@User2026!` | User created successfully |
| 3.5 | Create user (weak pw) | Create user with password `short` | 400 error: password policy violation |
| 3.6 | Edit user role | Edit a user, change role | Role updated, audit logged |
| 3.7 | Assignments page | Navigate to `/admin/assignments` | Org unit assignment interface loads |
| 3.8 | Settings update | Change `least_access_threshold` to 50 | Setting saved, reflected in dashboard |
| 3.9 | Audit log visible | Navigate to `/audit-log` | Entries for login, settings change, user creation |
| 3.10 | Generate Personas button | Navigate to `/personas` | "Generate Personas" button visible |
| 3.11 | Auto-Map button | Navigate to `/mapping` | "Auto-Map All" button visible |
| 3.12 | Run SOD button | Navigate to `/sod` | "Run SOD Analysis" button visible |
| 3.13 | Jobs run buttons | Navigate to `/jobs` | Play buttons visible on pipeline steps |
| 3.14 | Version in footer | Check sidebar footer | Shows "Provisum v0.6.0" |

---

## Suite 4: Admin (admin / demo.admin) — 12 tests

**Login:** `admin` / `AdminPass@2026!` OR `demo.admin` / `DemoGuide2026!`

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1 | Admin sidebar | Check sidebar | Admin section visible, System section NOT visible |
| 4.2 | Config Console blocked | Navigate to `/admin` | Redirected to `/unauthorized` (admin != system_admin) |
| 4.3 | App Users access | Navigate to `/admin/users` | Full CRUD available |
| 4.4 | Assignments access | Navigate to `/admin/assignments` | Assignment interface loads |
| 4.5 | Generate Personas | Navigate to `/personas` | Button visible and functional |
| 4.6 | Auto-Map Roles | Navigate to `/mapping` | Button visible |
| 4.7 | Run SOD Analysis | Navigate to `/sod` | Button visible |
| 4.8 | Approve mappings | Navigate to `/approvals` | Approve/Send Back buttons visible |
| 4.9 | Bulk delete | Navigate to `/personas`, select rows | "Bulk Delete" bar appears |
| 4.10 | All data visible | Navigate to `/users` | All 1,000 users shown (no scoping) |
| 4.11 | Release Comparison | Navigate to `/releases/compare` | Page loads (admin has access) |
| 4.12 | Project Timeline | Navigate to `/releases/timeline` | Page loads |

---

## Suite 5: Mapper — Finance (mapper.finance / demo.mapper.finance) — 16 tests

**Login:** `mapper.finance` / `Provisum@2026!` OR `demo.mapper.finance` / `DemoGuide2026!`

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | Scoped dashboard | Check dashboard stats | Shows Finance-scoped user count (not 1,000) |
| 5.2 | Scoped user list | Navigate to `/users` | Only Finance department users visible |
| 5.3 | Generate Personas | Navigate to `/personas` | "Generate Personas" button visible |
| 5.4 | Auto-Map visible | Navigate to `/mapping` | "Auto-Map All" button visible |
| 5.5 | Run SOD visible | Navigate to `/sod` | "Run SOD Analysis" button visible |
| 5.6 | Jobs run buttons | Navigate to `/jobs` | Play buttons visible on pipeline steps |
| 5.7 | Cannot approve | Navigate to `/approvals` | Approve queue visible but NO Approve/Send Back buttons |
| 5.8 | Admin blocked | Navigate to `/admin/users` | Redirected to `/unauthorized` |
| 5.9 | Config Console blocked | Navigate to `/admin` | Redirected to `/unauthorized` |
| 5.10 | No bulk delete | Navigate to `/personas` | No checkbox selection, no bulk delete bar |
| 5.11 | Persona list visible | Navigate to `/personas` | Persona cards/table loads |
| 5.12 | Mapping drag-drop | Navigate to `/mapping`, select persona | Can drag roles to Mapped section |
| 5.13 | SOD conflict actions | Navigate to `/sod` with conflicts | "Fix Mapping" and "Accept Risk" buttons visible |
| 5.14 | Export access | Navigate to `/exports` | Export buttons visible and functional |
| 5.15 | Release Comparison blocked | Navigate to `/releases/compare` | Redirected to `/unauthorized` |
| 5.16 | Strapline scoped | Check dashboard strapline | Area strapline mentions Finance scope |

---

## Suite 6: Mapper — Other Scopes — 6 tests

| # | Test | Login | Steps | Expected |
|---|------|-------|-------|----------|
| 6.1 | Maintenance scope | `mapper.maintenance` / `Provisum@2026!` | Navigate to `/users` | Only Maintenance + Facilities users |
| 6.2 | Procurement scope | `mapper.procurement` / `Provisum@2026!` | Navigate to `/users` | Only Procurement + Supply Chain + Warehouse |
| 6.3 | Security lead (all) | `security.lead` / `Security@2026!` | Navigate to `/users` | All users visible (all depts) |
| 6.4 | Security lead actions | `security.lead` | Navigate to `/personas` | Generate Personas button visible |
| 6.5 | Maint mapper actions | `mapper.maintenance` | Navigate to `/mapping` | Auto-Map button visible |
| 6.6 | Proc mapper SOD | `mapper.procurement` | Navigate to `/sod` | Run SOD Analysis visible |

---

## Suite 7: Approver — 14 tests

**Login:** `approver.finance` / `Provisum@2026!` OR `demo.approver` / `DemoGuide2026!`

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.1 | Dashboard loads | Navigate to `/dashboard` | Dashboard with approver context |
| 7.2 | NO Generate Personas | Navigate to `/personas` | No "Generate" button; if empty: "Waiting for personas..." |
| 7.3 | NO Auto-Map | Navigate to `/mapping` | No "Auto-Map All" button visible |
| 7.4 | NO Run SOD | Navigate to `/sod` | No "Run SOD Analysis" button; empty: "A mapper or admin needs to run..." |
| 7.5 | Jobs — status badges | Navigate to `/jobs` | Status badges (Done/Running/Pending) not play buttons |
| 7.6 | Approve mapping | Navigate to `/approvals` → Ready tab | "Approve" and "Send Back" buttons visible |
| 7.7 | Send Back with reason | Click "Send Back" on an assignment | Reason dialog opens, submit sends back |
| 7.8 | Bulk Approve | Click "Bulk Approve" button | All approvable items approved |
| 7.9 | SOD risk approval | Navigate to `/sod` with pending risk | "Approve Risk Acceptance" button visible |
| 7.10 | Admin blocked | Navigate to `/admin/users` | Redirected to `/unauthorized` |
| 7.11 | Persona list viewable | Navigate to `/personas` with data | List visible, no generate button |
| 7.12 | Mapping viewable | Navigate to `/mapping` with data | Data visible, no action buttons |
| 7.13 | Exports available | Navigate to `/exports` | Export buttons work |
| 7.14 | Compliance officer | Login `compliance.officer` / `Compliance@2026!` | Same approver access, all depts |

---

## Suite 8: Coordinator (demo.coordinator) — 8 tests

**Login:** `demo.coordinator` / `DemoGuide2026!`

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 8.1 | Dashboard loads | Navigate to `/dashboard` | Dashboard loads with coordinator context |
| 8.2 | NO Generate Personas | Navigate to `/personas` | No button; view-only |
| 8.3 | NO Auto-Map | Navigate to `/mapping` | No button; view-only |
| 8.4 | NO Run SOD | Navigate to `/sod` | No button; view-only message |
| 8.5 | Jobs — badges only | Navigate to `/jobs` | Status badges, no play buttons |
| 8.6 | Send Reminders | Navigate to `/inbox` | Can compose and send notifications |
| 8.7 | Cannot approve | Navigate to `/approvals` | View-only, no Approve/Send Back buttons |
| 8.8 | Admin blocked | Navigate to `/admin/users` | Redirected to `/unauthorized` |

---

## Suite 9: Viewer (viewer / demo.viewer) — 12 tests

**Login:** `viewer` / `Provisum@2026!` OR `demo.viewer` / `DemoGuide2026!`

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 9.1 | Dashboard loads | Navigate to `/dashboard` | View-only dashboard, project-wide stats |
| 9.2 | NO Generate Personas | Navigate to `/personas` | No button; if empty: "Waiting for personas..." |
| 9.3 | NO Auto-Map | Navigate to `/mapping` | No button; view-only |
| 9.4 | NO Run SOD | Navigate to `/sod` | No button; "A mapper or admin needs to run..." |
| 9.5 | Jobs — badges only | Navigate to `/jobs` | Status badges, no play buttons |
| 9.6 | Cannot approve | Navigate to `/approvals` | View-only, no Approve/Send Back |
| 9.7 | Cannot send reminders | Check `/inbox` | No compose button |
| 9.8 | Admin blocked | Navigate to `/admin/users` | Redirected to `/unauthorized` |
| 9.9 | Config Console blocked | Navigate to `/admin` | Redirected to `/unauthorized` |
| 9.10 | Users list viewable | Navigate to `/users` | Users visible (read-only) |
| 9.11 | Source Roles viewable | Navigate to `/source-roles` | Roles listed |
| 9.12 | GRC Analyst | Login `grc.analyst` / `GrcAnalyst@2026!` | Same viewer access, all depts |

---

## Suite 10: AI Pipeline — Full Workflow — 12 tests

**Login:** `admin` / `AdminPass@2026!`

> **Warning:** Tests 10.1–10.9 consume Anthropic API credits. Run sparingly.

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 10.1 | Persona generation starts | `/personas` → "Generate Personas" | Job created, progress shown |
| 10.2 | Job in history | Navigate to `/jobs` | Job row: "Persona Generation", status "running" |
| 10.3 | Job completes | Wait/poll | Status → "completed", records count shown |
| 10.4 | Personas populated | Navigate to `/personas` | Persona list with AI-generated personas |
| 10.5 | Business function filter | Use function dropdown | Filters by Finance, Procurement, etc. |
| 10.6 | Auto-map starts | `/mapping` → "Auto-Map All" | Job created, progress bar |
| 10.7 | Mappings populated | After auto-map | Personas have target roles assigned |
| 10.8 | SOD analysis starts | `/sod` → "Run SOD Analysis" | Job starts |
| 10.9 | Conflicts detected | After SOD completes | Conflict list with severity badges |
| 10.10 | Navigate during job | Start job, switch to `/users` | Page loads, job continues in background |
| 10.11 | Job error handling | If job fails | Error message in Jobs page Error column |
| 10.12 | Regenerate personas | "Regenerate Personas" with existing | New job, old personas replaced |

---

## Suite 11: Data Pages — 10 tests

**Login:** `admin` / `AdminPass@2026!`

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 11.1 | Users list | Navigate to `/users` | Table with 1,000 users, search works |
| 11.2 | User row click | Click a user row | Navigates to `/users/[userId]` detail page |
| 11.3 | User detail page | View `/users/[userId]` | User info, roles, persona, department |
| 11.4 | Source Roles | Navigate to `/source-roles` | 20 source roles with permissions |
| 11.5 | Target Roles | Navigate to `/target-roles` | 18 target roles listed |
| 11.6 | SOD Rules | Navigate to `/sod-rules` | 94+ SOD rules with severity |
| 11.7 | User search | Type in search on `/users` | Filters by name/email |
| 11.8 | Department filter | Filter by department | Only matching shown |
| 11.9 | Data Upload page | Navigate to `/upload` | Upload cards for each CSV type |
| 11.10 | Upload (viewer) | Login as viewer → `/upload` | View-only, no functional upload |

---

## Suite 12: Exports — 8 tests

**Login:** `admin` / `AdminPass@2026!`

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 12.1 | Excel export | Click "Export as Excel" | .xlsx downloads |
| 12.2 | PDF export | Click "Export as PDF" | .pdf downloads |
| 12.3 | Provisioning CSV | Click "Export Provisioning CSV" | .csv downloads |
| 12.4 | SailPoint export | Click SailPoint export | SailPoint-format file |
| 12.5 | SAP GRC export | Click SAP GRC export | SAP GRC-format file |
| 12.6 | ServiceNow export | Click ServiceNow export | ServiceNow-format file |
| 12.7 | SOD Exceptions | Click SOD Exceptions export | Exceptions file |
| 12.8 | Audit log export | `/audit-log` → export | Audit entries exported |

---

## Suite 13: Releases — 8 tests

**Login:** `admin` / `AdminPass@2026!`

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 13.1 | Releases page | Navigate to `/releases` | Wave 1 (active) and Wave 2 listed |
| 13.2 | View button | Click "View" on release | Release details shown |
| 13.3 | Create release | Click "+ Create Release" | Form with name, description, date |
| 13.4 | Release scope | View scope | Assigned users visible |
| 13.5 | Release comparison | `/releases/compare` | Side-by-side comparison |
| 13.6 | Project timeline | `/releases/timeline` | Timeline/Gantt view |
| 13.7 | Active release selector | Use release dropdown | Data scoped to selected release |
| 13.8 | Mapper blocked | Login mapper → `/releases/compare` | Redirected to `/unauthorized` |

---

## Suite 14: Notifications & Inbox — 6 tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 14.1 | Compose | Login coordinator → `/inbox` → Compose | Recipients, message, send button |
| 14.2 | Send | Select mapper, type message, Send | Toast: "Notification sent" |
| 14.3 | Receive | Login as mapper → `/inbox` | Notification in inbox |
| 14.4 | Unread badge | Check header bell | Badge with unread count |
| 14.5 | Mark read | Click "Mark all read" | Badge clears |
| 14.6 | Viewer no compose | Login viewer → `/inbox` | No compose button |

---

## Suite 15: Approvals Workflow — 10 tests

**Prerequisite:** Personas generated + auto-mapped (Suite 10)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 15.1 | Page loads | Login approver → `/approvals` | Ready tab with items |
| 15.2 | Approve single | Click "Approve" | Status → Approved, audit logged |
| 15.3 | Send back | "Send Back" → reason → submit | Item rejected with reason |
| 15.4 | Bulk approve | "Bulk Approve" | All Ready items approved |
| 15.5 | Dept bulk | Select dept → "Approve All [Dept]" | Confirmation, then approve |
| 15.6 | Approved tab | Switch tab | Previously approved items |
| 15.7 | Mapper no approve | Login mapper → `/approvals` | No Approve buttons |
| 15.8 | Viewer no approve | Login viewer → `/approvals` | View-only |
| 15.9 | SOD Risk tab | Switch tab | Risk-accepted items |
| 15.10 | Compliance tab | Switch tab | Compliance-approved items |

---

## Suite 16: SOD Conflict Resolution — 8 tests

**Prerequisite:** SOD analysis completed (Suite 10)

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 16.1 | Conflicts listed | Login mapper → `/sod` | Conflict cards with severity |
| 16.2 | Fix mapping | "Fix Mapping" on conflict | Mapping editor, can change role |
| 16.3 | Accept risk | "Accept Risk" | Risk accepted, conflict marked |
| 16.4 | Request acceptance | "Request Risk Acceptance" | Sends to approver queue |
| 16.5 | Approver sees | Login approver → `/sod` | Pending items visible |
| 16.6 | Approve risk | "Approve Risk Acceptance" | Approved, audit logged |
| 16.7 | Viewer no actions | Login viewer → `/sod` | Visible, no buttons |
| 16.8 | Summary stats | Check summary bar | Total conflicts, by severity |

---

## Suite 17: Demo Environment — 10 tests

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 17.1 | Demo pills visible | Navigate to `/login` | "Demo credentials:" with pills |
| 17.2 | Admin pill | Click "Admin" pill | `demo.admin` / `DemoGuide2026!` filled |
| 17.3 | Mapper pill | Click "Mapper" pill | `demo.mapper.finance` filled |
| 17.4 | Approver pill | Click "Approver" pill | `demo.approver` filled |
| 17.5 | Viewer pill | Click "Viewer" pill | `demo.viewer` filled |
| 17.6 | Coordinator pill | Click "Coordinator" pill | `demo.coordinator` filled |
| 17.7 | Switch environment | Select different env from dropdown | Loading spinner, data reseeds |
| 17.8 | Energy Chemicals | Switch to Energy & Chemicals | Different data loaded |
| 17.9 | Reset demo | Admin → Admin Console → Reset | Data reseeded |
| 17.10 | Oracle env | Switch to Oracle Fusion | Oracle permissions (OFC_ prefix) |

---

## Suite 18: All Credentials Reference

### Internal Accounts

| Username | Password | Role | Scope |
|----------|----------|------|-------|
| `sysadmin` | `Sysadmin@2026!` | system_admin | Full + system settings |
| `admin` | `AdminPass@2026!` | admin | Full access |
| `mapper.finance` | `Provisum@2026!` | mapper | Finance dept |
| `mapper.maintenance` | `Provisum@2026!` | mapper | Maintenance + Facilities |
| `mapper.procurement` | `Provisum@2026!` | mapper | Procurement + Supply Chain + Warehouse |
| `approver.finance` | `Provisum@2026!` | approver | Finance dept |
| `approver.operations` | `Provisum@2026!` | approver | Maint + Facilities + Proc + SC + Warehouse |
| `viewer` | `Provisum@2026!` | viewer | Read-only |
| `security.lead` | `Security@2026!` | mapper | All depts |
| `compliance.officer` | `Compliance@2026!` | approver | All depts |
| `grc.analyst` | `GrcAnalyst@2026!` | viewer | All depts |

### Demo Accounts

| Username | Password | Role | Scope |
|----------|----------|------|-------|
| `demo.admin` | `DemoGuide2026!` | admin | Full access |
| `demo.mapper.finance` | `DemoGuide2026!` | mapper | Finance dept |
| `demo.approver` | `DemoGuide2026!` | approver | All depts |
| `demo.viewer` | `DemoGuide2026!` | viewer | Read-only |
| `demo.coordinator` | `DemoGuide2026!` | coordinator | All depts |

---

## Role Permission Matrix

| Action | system_admin | admin | mapper | approver | coordinator | viewer |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|
| Generate Personas | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Auto-Map Roles | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Run SOD Analysis | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pipeline Jobs (run) | ✅ | ✅ | ✅ | badge | badge | badge |
| Fix SOD Mapping | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Accept Risk (self) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve Mappings | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Approve Risk | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Send Notifications | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Bulk Delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage App Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Config Console | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Exports | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Audit Log | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
