# AIRM Product Roadmap

This document outlines planned features and improvements, organised by priority tier. Items are not committed to a fixed release schedule — priority shifts based on user feedback and project timelines.

---

## Near-term (next 1–2 releases)

### User invite flow (admin setup simplification)
- When an admin adds a new user, the system should send an automated invite email so the user can set their own password
- Admin setup requires only: First Name, Last Name, Email, and AIRM Role — no password field
- Passwords are never visible to admin or system admin in production environments (demo environments may expose them for testing convenience)
- Admin can trigger a password reset email from the user management page at any time
- Scope: `POST /api/admin/users` triggers invite; `POST /api/admin/users/[id]/reset-password` triggers reset email; invite token flow through `lib/email.ts`

### Source and target permissions UI consolidation
- Source permissions should not appear as a standalone page in the navigation — they should live as a sub-section on the Source Roles page (visible in context of the role they belong to)
- Target permissions follow the same pattern — they belong on the Target Roles page, not as a separate route
- The standalone permissions pages in the legacy/data explorer area should be removed or redirected
- This change is UI/navigation only; the underlying schema and API endpoints are unchanged

### Email transport for notifications
- Current state: notifications are demo-only (stored in DB, no email sent)
- Goal: wire a real SMTP/transactional email provider (Resend, SendGrid, or similar) so coordinators can notify mappers and approvers out-of-band
- Scope: `lib/email.ts` adapter, `POST /api/notifications` triggers send, undeliverable handling
- Config: `email_provider`, `email_from_address` settings in admin console

### Bulk mapping actions
- Allow mappers to assign the same target role to multiple personas in a single action
- Filter personas by coverage gap, then multi-select and bulk-assign
- Useful when one source role maps cleanly to one target role across a department

### Approval batch processing
- Approvers currently approve one assignment at a time
- Add "Approve all ready assignments for this department" action
- Confirmation modal shows count and previews any SOD flags before committing

### Export enhancements
- Add Excel export with multiple tabs (users, personas, mappings, SOD conflicts)
- PDF report with cover sheet, executive summary, and per-department tables
- Scheduled export: allow admin to configure a nightly CSV drop to a configured path or S3 bucket

---

## Medium-term (3–5 releases out)

### Release wave comparison
- Side-by-side view of two releases: role coverage, approval rates, SOD conflict delta
- Useful for auditors and project managers tracking progress across migration waves

### AI confidence calibration
- Surface low-confidence persona assignments in a dedicated review queue (not just a badge)
- Allow mappers to accept, recluster, or manually reassign low-confidence users
- Track calibration decisions in audit log

### Read-only external reviewer link
- Generate a time-limited shareable link to a dashboard snapshot (no auth required)
- Intended for business stakeholders and auditors who do not need an app account
- Snapshot is static HTML — no live DB access

### SOD rulebook editor
- Currently SOD rules are uploaded as CSV and are read-only in the app
- Add in-app editor: add rules, edit severity, deactivate rules without re-uploading
- Track rule change history in audit log

### Multi-release project timeline
- Gantt-style view showing all releases, their stages, and completion status with key dates (SIT, UIT, Cutover, Go Live)

---

## Longer-term / exploratory

### Target system security design integration adapter (evergreen role library)
- Connect AIRM directly to the client's target system (SAP S/4HANA, Workday, ServiceNow, Oracle Fusion) to import and continuously sync the security design — specifically: target roles, task roles, and their permission assignments
- Priority targets: SAP S/4HANA (RFC/BAPI or BTP APIs), Workday (REST), ServiceNow (CMDB/REST), Oracle Fusion (REST)
- Adapter pattern: each system implements a common `TargetSystemAdapter` interface (fetch roles, fetch task roles, fetch role-permission assignments, diff against current DB state)
- **Why this matters for clients and compliance teams:** Security architects continue to evolve the target role design throughout the project. If a mapper has already mapped 50 users to a role and that role's permissions change — new permissions added, permissions removed, SOD implications altered — the mapper currently has no way to know. This gap creates cutover surprises and compliance risk.
- **Security design change tracking:** When the adapter detects a diff between the live target system design and what is stored in AIRM, it records a `securityDesignChange` event: what changed (permission added/removed, role renamed, role deleted), when it was detected, and which personas and user assignments reference the affected role.
- **Mapper notifications:** Any mapper who has assigned users to an affected target role receives an in-app notification (and email, when email transport is enabled): "Role [X] was updated in the target system. [N] of your mappings reference this role and should be reviewed before approval." The mapping status is flagged as `pending_design_review` until the mapper acknowledges or re-submits for SOD analysis.
- **Compliance audit trail:** All design change events and mapper acknowledgements are written to the audit log, providing a complete record of what the design looked like at each point in the project — critical for cutover sign-off and post-go-live audit.
- Initial scope: read-only pull and diff; no write-back to the target system
- Requires per-client credential management and connection testing in the admin console

### Target system provisioning adapter
- After approvals, generate a provisioning payload in a configurable format (S/4HANA BAPI, IGA connector, flat file)
- Adapter pattern so multiple target systems can be supported
- Provisioning status feedback loop (mark user as "provisioned" once confirmed)

### SSO / SAML integration
- Replace username/password auth with enterprise SSO (Azure AD, Okta, SAML 2.0)
- App roles mapped to IdP groups
- Removes the need for local password management

### API / webhook layer for integrations
- REST API for external systems to query mapping status, trigger exports, or post data
- Webhook support for events: new conflicts detected, all approvals complete, export ready
- Intended for integration with GRC tools, ticketing systems, and project dashboards

### AI-assisted mapping suggestions
- Extend the current AI persona generation to suggest target role mappings
- Confidence score per suggestion; mapper reviews and accepts/overrides
- Learns from accepted mappings within the project to improve suggestions over time

### Multi-tenancy / project isolation
- Current design is single-project (one migration at a time per instance)
- Long-term: support multiple concurrent projects under one AIRM instance
- Useful for consultancies running multiple client migrations simultaneously

---

## Completed (see CHANGELOG.md for detail)

| Feature | Release |
|---------|---------|
| Core workflow: upload → persona → mapping → SOD → approval | v0.1.0 |
| Cookie-based auth, role-based access, org-unit scoping | v0.2.0 |
| Coordinator role, in-app notifications, Provisioning Alerts | v0.3.0 |
| Provisioning Alerts on dashboard, strapline rewrite, Render deployment | Unreleased |
