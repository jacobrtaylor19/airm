# Provisum API Reference

All API routes are under `/api/`. Server components fetch data directly from the database — the API layer handles mutations and integrations only.

For the machine-readable OpenAPI spec, see `docs/openapi.yaml`.

---

## Authentication

All endpoints require a valid Supabase JWT session cookie set by `@supabase/ssr`. The middleware validates the JWT on every request and rejects unauthenticated calls with `401`.

Role hierarchy (highest → lowest): `system_admin` (100) → `admin` (80) → `project_manager` (70) → `approver` (60) → `coordinator` (50) → `mapper` (40) → `viewer` (20).

Scoped roles (`mapper`, `approver`, `coordinator`) see only users within their assigned org unit subtree. `admin`, `project_manager`, `viewer`, and `system_admin` have no scope restriction.

---

## Auth

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/auth/login` | — | Sign in with username + password. Returns a Supabase JWT session cookie. |
| `POST` | `/api/auth/logout` | any | Clear session cookie and invalidate the Supabase session. |
| `POST` | `/api/auth/setup` | — | Create the initial admin account (first-run only; locked after the first user is created). |
| `POST` | `/api/auth/sso` | — | Initiate an SSO login via Supabase SAML. Requires an active `ssoConfigurations` row. |
| `POST` | `/api/auth/accept-tos` | any | Record terms-of-service acceptance for the current user. |
| `POST` | `/api/auth/change-password` | any | Change the authenticated user's password (requires current password). |

---

## AI Pipeline

Long-running AI jobs run as background tasks via `waitUntil()`. All endpoints return a `jobId` immediately. Poll `GET /api/jobs/[id]` for status.

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/ai/persona-generation` | admin | Trigger Claude to cluster uploaded users into security personas (2-phase: AI sample + programmatic assignment). |
| `POST` | `/api/ai/persona-assignment` | mapper | AI-assisted assignment of a single user to a persona. |
| `POST` | `/api/ai/target-role-mapping` | mapper | AI-assisted mapping of a persona to target roles. |
| `POST` | `/api/ai/end-user-mapping` | mapper | AI-assisted direct user → target role mapping (bypasses persona stage). |

---

## Mapping

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/mapping/persona-roles` | mapper | Save persona → target role assignments for one or more personas. |
| `POST` | `/api/mapping/bulk-assign` | mapper | Bulk assign multiple personas to the same target role. |
| `GET`  | `/api/mapping/ai-suggestions` | mapper | Fetch Claude-generated role suggestions for a persona. |
| `POST` | `/api/mapping/ai-suggestions/feedback` | mapper | Submit accept/reject feedback on an AI suggestion (feeds `mappingFeedback`). |
| `POST` | `/api/mapping/submit-review` | mapper | Submit a persona mapping for approver review. |

---

## Approvals

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/approvals/approve` | approver | Approve a user assignment. |
| `POST` | `/api/approvals/send-back` | approver | Reject and return an assignment to the mapper with a comment. |
| `POST` | `/api/approvals/bulk-approve` | approver | Approve all pending assignments in the current user's scope. |

---

## SOD

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/sod/analyze` | mapper | Run SOD conflict detection against the SOD rulebook for all current assignments. |
| `POST` | `/api/sod/accept-risk` | approver | Accept a SOD conflict with a written justification and optional mitigating controls. |
| `POST` | `/api/sod/request-risk-acceptance` | mapper | Request approver sign-off on a SOD conflict the mapper cannot resolve. |
| `POST` | `/api/sod/escalate` | mapper | Escalate a SOD conflict to the security or compliance workspace. |
| `POST` | `/api/sod/remap` | mapper | Remap a user to a different target role to resolve a SOD conflict. |
| `POST` | `/api/sod/fix-mapping` | mapper | Apply a suggested fix to resolve a SOD conflict. |
| `GET/POST` | `/api/sod-rules` | admin | Fetch or create SOD rules. |

### SOD Triage

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/sod-triage/accept-risk` | approver | Accept a triage work item as an accepted risk. |
| `POST` | `/api/sod-triage/route-to-security` | approver | Route a triage item to the security workspace. |
| `POST` | `/api/sod-triage/update-ruleset` | admin | Update SOD ruleset configuration for a release. |
| `GET/PATCH` | `/api/sod-triage/work-items/[id]` | approver | Get or update a SOD triage work item. |
| `POST` | `/api/sod-triage/work-items/[id]/complete` | approver | Mark a triage work item as complete. |

---

## Personas

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET/POST` | `/api/personas/create` | admin | Create a persona manually. |
| `POST` | `/api/personas/confirm` | approver | Confirm a persona (locks it from further AI reassignment). |
| `GET` | `/api/personas/confirmations` | admin | List confirmation status for all personas. |
| `POST` | `/api/personas/reset-confirmation` | admin | Reset persona confirmation status. |

---

## Releases

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET/POST/PATCH/DELETE` | `/api/releases` | admin | Release CRUD. POST body requires `name`, `startDate`, `endDate`. |
| `POST` | `/api/releases/select` | mapper | Set the active release for the current session. |
| `GET/POST` | `/api/releases/[id]/scope` | admin | Fetch or update the scoped users, org units, source roles, and target roles for a release. |

---

## Provisioning Alerts (Least Access)

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/least-access/exceptions` | approver | Accept an over-provisioning exception with a written justification. |
| `DELETE` | `/api/least-access/exceptions` | approver | Revoke an existing exception (re-flags the alert). |

---

## Calibration

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET/POST` | `/api/calibration` | mapper | Fetch low-confidence assignments or submit manual corrections. |

---

## Lumen AI Chatbot

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/assistant/chat` | any | Send a message to Lumen. Returns a streaming response. `maxDuration = 300`. |
| `GET` | `/api/assistant/conversations` | any | List conversation history for the current user. |
| `GET/DELETE` | `/api/assistant/conversations/[id]` | any | Fetch or delete a specific conversation. |

---

## Notifications

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/notifications` | coordinator | Send an in-app notification to one or more recipients. |
| `PATCH` | `/api/notifications/mark-all-read` | any | Mark all notifications as read for the current user. |

---

## Review Links

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET/POST` | `/api/review-links` | admin | List or create external review links (public URLs for stakeholder review). |

---

## Refinements

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/refinements/save` | mapper | Save manual refinement edits to a persona-to-role mapping. |

---

## Exports

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET` | `/api/exports/excel` | mapper | Full data export — multi-sheet Excel workbook (users, personas, mappings, SOD, audit). |
| `GET` | `/api/exports/pdf` | mapper | Project status PDF report. |
| `GET` | `/api/exports/provisioning` | mapper | CSV provisioning export for the current release. |
| `GET` | `/api/exports/sod-exceptions` | approver | Excel export of all accepted SOD conflict exceptions. |
| `GET` | `/api/exports/status-slide` | admin | PowerPoint status slide for the current release. |
| `GET` | `/api/exports/security-design` | admin | Security design export (role catalog, permission matrix, SOD summary). |
| `GET` | `/api/exports/grc/sap` | admin | GRC adapter export in SAP format. |
| `GET` | `/api/exports/grc/sailpoint` | admin | GRC adapter export in SailPoint format. |
| `GET` | `/api/exports/grc/servicenow` | admin | GRC adapter export in ServiceNow format. |

---

## Upload

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/upload/[type]` | admin | Upload a CSV or Excel file. `type` is one of: `users`, `source-roles`, `target-roles`, `sod-rules`, `permissions`. |
| `GET` | `/api/upload/templates` | admin | Download upload template files. |

---

## Admin

### User Management

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET/POST` | `/api/admin/app-users` | admin | List or create application users. |
| `GET/PATCH/DELETE` | `/api/admin/app-users/[id]` | admin | Get, update, or delete a single app user. |
| `POST` | `/api/admin/users/invite` | admin | Send a single user invite via email. |
| `POST` | `/api/admin/users/invite/accept` | — | Accept an invite and create an account (unauthenticated). |
| `POST` | `/api/admin/users/invite/resend` | admin | Resend a pending invite email. |
| `POST` | `/api/admin/users/bulk-invite` | admin | Upload a CSV to invite multiple users at once. |
| `POST` | `/api/admin/bulk-delete` | admin | Bulk delete source users from the project. |
| `GET/POST/DELETE` | `/api/admin/assignments` | admin | Work assignment CRUD (assign mappers/approvers to org units). |
| `GET/POST` | `/api/admin/release-assignments` | admin | Assign app users to releases. |

### Config & Settings

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET/POST` | `/api/settings` | admin | Fetch or update system settings (key-value pairs). |
| `GET/POST` | `/api/admin/feature-flags` | system_admin | Feature flag management (name, enabled, targeting rules). |
| `GET/POST` | `/api/admin/scheduled-exports` | admin | Configure recurring exports (schedule, format, filters). |
| `POST` | `/api/admin/rotate-keys` | system_admin | Rotate the AES-256-GCM encryption key and re-encrypt all stored secrets. |

### SSO

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET/POST` | `/api/admin/sso` | system_admin | List or create SSO (SAML) configurations. |
| `GET/PATCH/DELETE` | `/api/admin/sso/[id]` | system_admin | Get, update, or delete an SSO configuration. |

### Security Design

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET/POST` | `/api/admin/security-design` | admin | Manage security design state (system connectivity, pull status). |
| `POST` | `/api/admin/security-design/test-connection` | admin | Test connectivity to the target security design system. |
| `POST` | `/api/admin/security-design/pull` | admin | Pull current role and permission state from the target system. |
| `GET` | `/api/admin/security-design/changes` | admin | Fetch role change log since last pull. |

### Incidents

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET/POST` | `/api/admin/incidents` | admin | List or create migration incidents. |
| `GET/PATCH` | `/api/admin/incidents/[id]` | admin | Get or update an incident. |
| `POST` | `/api/admin/incidents/[id]/retriage` | admin | Re-run AI triage on an incident. |

### Evidence & Reporting

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET` | `/api/admin/evidence-package` | admin | Generate the SOX evidence package Excel workbook. |
| `GET` | `/api/admin/activity-pulse` | admin | Fetch recent activity metrics for the migration health dashboard. |
| `GET` | `/api/admin/validation` | system_admin | Run pipeline validation — returns attribution chain data, edge cases, and confidence histograms. |
| `GET` | `/api/admin/validation/export` | system_admin | Export pipeline validation results as a 5-tab Excel workbook. |

### Data Management

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET` | `/api/admin/data-export` | admin | Export a full data dump (GDPR data portability). |
| `POST` | `/api/admin/data-deletion` | admin | Delete a user's personal data (GDPR right to erasure). |
| `POST` | `/api/admin/test-email` | admin | Send a test email to verify Resend is configured correctly. |

---

## Org & Workstream

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET` | `/api/org-hierarchy` | any | Return the org unit tree for the current organization. |
| `GET/POST` | `/api/workstream` | mapper | Fetch or update workstream task items. |

---

## Jobs

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET` | `/api/jobs/[id]` | any | Poll the status of a background job. Returns `{ status, progress, error }`. |

---

## Demo

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `POST` | `/api/demo/register` | — | Register for demo access (lead capture). |
| `POST` | `/api/demo/reset` | system_admin | Reset demo data to the seeded state. |
| `POST` | `/api/demo/switch` | system_admin | Switch to a different demo environment pack. |

---

## System

| Method | Path | Min Role | Description |
|--------|------|----------|-------------|
| `GET` | `/api/health` | — | Health check. Returns `{"status":"ok","components":{"database":"connected"}}`. |
| `GET` | `/api/cron/exports` | — | Cron trigger for scheduled exports. Auth via `CRON_SECRET` header. |
| `GET` | `/api/docs/openapi` | — | Serve the OpenAPI spec. |

---

## Error Responses

All endpoints return JSON errors in a consistent shape:

```json
{
  "error": "Human-readable message"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request — validation error or missing required field |
| `401` | Unauthenticated — no valid session cookie |
| `403` | Forbidden — authenticated but insufficient role |
| `404` | Resource not found |
| `409` | Conflict — e.g. duplicate invite, already accepted |
| `500` | Internal server error — check Sentry for details |

---

## Common Patterns

### Request Body (POST/PATCH)

All write endpoints accept `Content-Type: application/json`. Example:

```typescript
const res = await fetch("/api/approvals/approve", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ assignmentId: 42 }),
});
const data = await res.json();
```

### Server Component Usage

Pages read data directly from the database and call API routes only for mutations. Do not call API routes from server components for reads.

```typescript
// app/mapping/page.tsx — reads from DB directly (no API call)
import { requireAuth } from "@/lib/auth";
import { getPersonas } from "@/lib/queries";

export default async function MappingPage() {
  const user = await requireAuth();
  const personas = await getPersonas(user.organizationId);
  return <MappingWorkspace personas={personas} />;
}

// Client component — calls API for mutations
"use client";
async function handleApprove(assignmentId: number) {
  await fetch("/api/approvals/approve", {
    method: "POST",
    body: JSON.stringify({ assignmentId }),
  });
  router.refresh();
}
```
