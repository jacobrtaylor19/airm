# AIRM Product Roadmap

This document outlines planned features and improvements. Sprint 2 is the active build queue. Items below it are prioritised but not yet scheduled.

*Last updated: March 26, 2026 (evening — security sprint complete, demo environments live, role-based action gating implemented)*

---

## Sprint 2 — Active Build Queue

### 1. AI Agent / Chatbot (contextual assistant on every page)
- Embedded AI assistant that understands the data on screen and helps users make decisions
- Page-aware: on SOD Analysis it explains conflicts; on Mapping it suggests roles; on Dashboard it summarises status
- Answers natural-language questions: "Why was this user assigned to this persona?", "What happens if I remove this role?", "Which conflicts are blocking approval?"
- Suggests next actions based on workflow state
- Full PRD: `docs/product/PRD_AGENT_CHATBOT_CURRENT.md`

### ~~2. Persona confirmation gate~~ — REMOVED
- **Decision (2026-03-26):** Removed during demo prep. Added friction without clear value. The persona workflow works better without a gate — mappers generate, review, and proceed to mapping directly. If a quality gate is needed later, revisit as a lighter-weight "lock personas" toggle rather than per-org-unit confirmation.

### 3. Bulk mapping actions
- Allow mappers to assign the same target role to multiple personas in a single action
- Filter personas by coverage gap, then multi-select and bulk-assign
- Useful when one source role maps cleanly to one target role across a department

### 4. User invite flow + mass user upload
- **Single user:** Admin adds user with First Name, Last Name, Email, and AIRM Role only — no password field. System sends an invite email so the user sets their own password.
- **Mass upload:** Admin/system_admin uploads a CSV template (first_name, last_name, email, role). System creates all accounts and sends invite emails in batch. Restricted to admin and system_admin only.
- CSV template available as a downloadable file from the App Users page with the role column pre-populated as a picklist of valid AIRM roles
- Passwords are never visible to admin or system admin in production environments (demo environments may expose them for testing convenience)
- Admin can trigger a password reset email from the user management page at any time
- Scope: `POST /api/admin/users` triggers invite; `POST /api/admin/users/bulk-upload` handles CSV; `POST /api/admin/users/[id]/reset-password` triggers reset email; invite token flow through `lib/email.ts`

### 5. Data upload template enhancements
- All CSV upload templates should include **preconfigured picklists** for fields/values that are already defined in the tool
- Examples: department picklist from org hierarchy, role names from existing source/target roles, severity levels for SOD rules, permission types from existing permissions
- Templates downloadable from the Data Upload page with headers + picklist columns pre-filled
- Validation on upload should check picklist values and flag mismatches before commit

### 6. Export enhancements
- Multi-tab Excel export (users, personas, mappings, SOD conflicts)
- PDF report with cover sheet, executive summary, and per-department tables
- Scheduled export: allow admin to configure a nightly CSV drop to a configured path or S3 bucket

### 7. Multi-tenancy / project isolation
- Current design is single-project (one migration at a time per instance)
- Support multiple concurrent projects under one AIRM instance
- Useful for consultancies running multiple client migrations simultaneously
- Requires project-scoped data isolation, project switcher in UI, and project-level admin

### 8. Approval batch processing (enhancement)
- Partially done: row checkboxes + "Approve Selected" added in mega-sprint
- Still needed: "Approve all ready assignments for this department" action
- Confirmation modal shows count and previews any SOD flags before committing

### 9. Release comparison
- Side-by-side view of two releases: role coverage, approval rates, SOD conflict delta
- Useful for auditors and project managers tracking progress across migration phases
- **New role required:** `project_manager` — add to `ROLE_HIERARCHY` (suggested level: 70, between approver and admin)
- **Visibility:** system_admin, admin, project_manager
- Not called "wave comparison" — use "release comparison"

### 10. Read-only external reviewer link
- Generate a shareable link to a dashboard snapshot (no auth required, no expiration)
- Intended for business stakeholders and auditors who do not need an app account
- Snapshot is static HTML — no live DB access

### 11. SOD rulebook editor
- Currently SOD rules are uploaded as CSV and are read-only in the app
- Add in-app editor: add rules, edit severity, deactivate rules without re-uploading
- **Access restricted to compliance roles only** (compliance.analyst, security.admin, and admin/system_admin)
- Track rule change history in audit log

### 12. Multi-release project timeline
- Gantt-style view showing all releases, their stages, and completion status with key dates (SIT, UIT, Cutover, Go Live)

### 13. SSO / SAML integration
- Replace username/password auth with enterprise SSO (Azure AD, Okta, SAML 2.0)
- App roles mapped to IdP groups
- Removes the need for local password management

### 14. GRC provisioning export adapter
- Push approved role mappings directly to a GRC tool (SAP GRC, ServiceNow, SailPoint) in a format that automates security setup/provisioning
- Adapter pattern: each GRC target implements a common `GrcExportAdapter` interface
- Formats: SAP GRC role assignment upload, ServiceNow CMDB import, SailPoint identity governance feed
- Not a query API — this is a push-based export of finalized, approved mappings
- Initial scope: generate the export file; direct API push to GRC is a later phase

---

## Deferred — Keep in Roadmap

These are valuable features that are not prioritised for the current sprint. They remain in the roadmap for future scheduling.

### Email transport for notifications
- Current state: notifications are demo-only (stored in DB, no email sent)
- Goal: wire a real SMTP/transactional email provider (Resend, SendGrid, or similar) so coordinators can notify mappers and approvers out-of-band
- Scope: `lib/email.ts` adapter, `POST /api/notifications` triggers send, undeliverable handling
- Config: `email_provider`, `email_from_address` settings in admin console

### Target system security design integration adapter (evergreen role library)
- Connect AIRM directly to the client's target system (SAP S/4HANA, Workday, ServiceNow, Oracle Fusion) to import and continuously sync the security design — specifically: target roles, task roles, and their permission assignments
- Plumbing already exists: `securityDesignChanges` table and `pending_design_review` status were added in the mega-sprint
- Priority targets: SAP S/4HANA (RFC/BAPI or BTP APIs), Workday (REST), ServiceNow (CMDB/REST), Oracle Fusion (REST)
- Adapter pattern: each system implements a common `TargetSystemAdapter` interface
- **Why this matters:** Security architects continue to evolve the target role design throughout the project. If a mapper has already mapped 50 users to a role and that role's permissions change, the mapper currently has no way to know. This gap creates cutover surprises and compliance risk.
- Initial scope: read-only pull and diff; no write-back to the target system

### Target system provisioning adapter
- After approvals, generate a provisioning payload in a configurable format (S/4HANA BAPI, IGA connector, flat file)
- Adapter pattern so multiple target systems can be supported
- Provisioning status feedback loop (mark user as "provisioned" once confirmed)

### AI confidence calibration
- Surface low-confidence persona assignments in a dedicated review queue (not just a badge)
- Allow mappers to accept, recluster, or manually reassign low-confidence users
- Track calibration decisions in audit log

### AI-assisted mapping suggestions
- Extend the current Auto-Map algorithm with an AI layer that considers business function, job titles, and permission patterns — not just permission overlap
- Confidence score per suggestion; mapper reviews and accepts/overrides
- Learns from accepted/rejected mappings within the project to improve suggestions over time
- Think of it as "Auto-Map v2" with AI reasoning and feedback loop

### Webhook event layer
- AIRM fires events to external URLs when things happen — e.g., "all approvals complete for Release 1" triggers a Jira ticket, or "new critical SOD conflict" pings a Slack channel
- Deferred: not needed right now

### ML confidence enrichment layer (XGBoost sidecar)
- XGBoost model trained on 411K+ synthetic users, validated with three-tier holdout evaluation (99.6% easy, 92% novel titles, 97.4% adversarial)
- Runs as a Python HTTP sidecar alongside the Next.js app, enriching Claude zero-shot persona assignments with a second opinion
- Produces composite confidence scores and actionable recommendations (auto_confirm / soft_confirm / review / block)
- Full integration code was prototyped and tested (schema changes, sidecar client, pipeline hook, UI badges) then reverted — ready to wire in when real client data is available to validate
- Model code, training scripts, and eval results live in `ml/`. See `ml/ML_CONFIDENCE_ENRICHMENT.md` for full documentation.
- **Blocked on:** Real client data to validate model beyond synthetic distributions. Current synthetic-only training ceiling means integration adds complexity without provable lift. Revisit after first real deployment with client user data.

---

## Completed (see CHANGELOG.md for detail)

| Feature | Release |
|---------|---------|
| Core workflow: upload → persona → mapping → SOD → approval | v0.1.0 |
| Cookie-based auth, role-based access, org-unit scoping | v0.2.0 |
| Coordinator role, in-app notifications, Provisioning Alerts | v0.3.0 |
| Provisioning Alerts on dashboard, strapline rewrite, Render deployment | v0.3.1 |
| Mega-sprint: 7 bug fixes, 5 design spec updates, 28 tables | v0.4.0 |
| Source/target permissions UI consolidation (inline on parent pages) | v0.4.0 |
| **Sprint 2: AI chatbot (Lumen), persona confirmation gate, bulk mapping** | v0.5.0 |
| **Sprint 2: Methodology page, Overview page, guided onboarding tour** | v0.5.0 |
| **Sprint 2: Public landing page, brand refresh (AIRM → Provisum)** | v0.5.0 |
| **UX overhaul: dark sidebar, header redesign, Lumen rename, pagination** | v0.5.0 |
| **UX overhaul: upload accordion, audit log improvements, teal AI buttons** | v0.5.0 |
| **UX overhaul: export card accents, empty states, status badges, mapping refinements** | v0.5.0 |
| **Seed data: 3 demo environments (Default, Energy & Chemicals, Financial Services)** | v0.5.0 |
| **Demo data refresh: 8 environments, 10K-user enterprise packs, Oracle/Workday/Salesforce** | v0.7.0 |
| **Sprint 3: Release scoping schema (4 junction tables, context provider, selector)** | v0.6.0 |
| **Sprint 3: Multi-release seed data (Wave 1 + Wave 2)** | v0.6.0 |
| **Sprint 3: Release assignment admin UI (CRUD on Assignments page)** | v0.6.0 |
| **Sprint 3: Upload auto-association with active release** | v0.6.0 |
| **Sprint 3: Notification inbox (/inbox) with read/unread, dismiss all, action links** | v0.6.0 |
| **Sprint 3: Workflow event notifications (persona gen, mapping, SOD analysis)** | v0.6.0 |
| **Sprint 3: Unread notification badge on header bell icon** | v0.6.0 |
| **Evening: Role-aware strapline, persona page redesign, QRG page** | v0.6.0 |
| **Evening: Dashboard scoping, Send Reminders visibility, Lumen data context** | v0.6.0 |
| **Evening: Auto-approve rework (routes to approver), empty states, status badges** | v0.6.0 |
| **R5: Upload template dynamic picklist validation** | v0.6.0 |
| **R6: Export enhancements (Cover Sheet, Executive Summary in Excel + PDF)** | v0.6.0 |
| **R8: Approval batch processing (Approve All for Department)** | v0.6.0 |
| **R9: Release comparison page + project_manager role** | v0.6.0 |
| **R10: Read-only external reviewer link (/review/[token])** | v0.6.0 |
| **R11: SOD rulebook editor (in-app CRUD, compliance access)** | v0.6.0 |
| **R12: Multi-release project timeline** | v0.6.0 |
| **R14: GRC export adapters (SAP GRC, ServiceNow, SailPoint)** | v0.6.0 |
| **Security compliance hardening (SOC 2 readiness)** | v0.6.0 |
| **Demo data refresh: 9 environments, 1K default, clean demo state** | v0.6.0 |
| **Self-guided demo environment with 6 demo accounts** | v0.6.0 |
| **AI pipeline: 2-phase persona generation, fire-and-forget jobs** | v0.6.0 |
| **Role-based action gating (approver/viewer view-only)** | v0.6.0 |
| **QA fixes: lockout, password validation, 404 page, UX polish** | v0.6.0 |
