# Provisum Product Roadmap

This document outlines planned features and improvements. Sprint 2 is the active build queue. Items below it are prioritised but not yet scheduled.

*Last updated: April 20, 2026 — v1.5.0*

---

## Owner Action Required

| # | Action | Blocks | Status |
|---|--------|--------|--------|
| 1-6 | ~~Sentry DSN, auth token, Resend API key, app URL, cron secret~~ | Various | ✅ ALL DONE (2026-03-30) |
| 7 | ~~Set `SENTRY_ORG` + `SENTRY_PROJECT`~~ on Vercel (provisum-demo/prod) | Source map uploads to Sentry | ✅ DONE (2026-04-11) |

---

## Sprint 2 — Active Build Queue

### ~~1. AI Agent / Chatbot (contextual assistant on every page)~~ ✅ DONE (Phase 1)
- Phase 1 (read-only assistant) is live: floating teal widget, Claude streaming, role-aware context, Cmd+K toggle
- Phase 2 (tool calling / actions) and Phase 3 (RAG) remain on the roadmap
- Full PRD: `docs/product/PRD_AGENT_CHATBOT_CURRENT.md`

### ~~2. Persona confirmation gate~~ — REMOVED

### ~~3. Bulk mapping actions~~ ✅ DONE
- Multi-select personas + bulk assign same target role, search/filter chips, coverage badges, Select All visible

### ~~4. User invite flow + mass user upload~~ ✅ DONE
- Single invite + bulk CSV upload + accept flow + resend invite — all built and deployed
- **⚠️ Blocked on:** Owner Action #4 (set `RESEND_API_KEY` on `airm` Vercel project) — without it, invite emails silently skip

### ~~5. Data upload template enhancements~~ ✅ DONE
- Dynamic picklist templates from live DB, template download buttons, enhanced validation

### ~~6. Export enhancements~~ ✅ DONE
- Multi-tab Excel, PDF with cover sheet + exec summary, scheduled exports with Vercel cron

### ~~7. Multi-tenancy / project isolation~~ ✅ DONE (Phase 1)
- `organizations` table, `organization_id` on 10 entity tables, `lib/org-context.ts` helpers, backward-compatible nullable columns

### ~~8. Approval batch processing~~ ✅ DONE
- Row checkboxes, Approve Selected, Approve All for Department

### ~~9. Release comparison~~ ✅ DONE
- Side-by-side release comparison, project_manager role added

### ~~10. Read-only external reviewer link~~ ✅ DONE
- `/review/[token]` shareable snapshot

### ~~11. SOD rulebook editor~~ ✅ DONE
- In-app CRUD, compliance-restricted

### ~~12. Multi-release project timeline~~ ✅ DONE
- Gantt-style timeline view

### ~~13. SSO / SAML integration~~ ✅ MVP DONE (v1.2.0)
- Admin SSO configuration UI, domain lookup API, login SSO flow built
- Actual IdP redirect needs Supabase Enterprise or direct SAML library — deferred until real customer conversation

### ~~14. GRC provisioning export adapter~~ ✅ DONE
- SAP GRC, ServiceNow, SailPoint export formats

### ~~15. Sales site design fixes (provisum.io)~~ — COMPLETE (2026-03-28)
- ~~Fix demo embed~~ — replaced broken iframe with static simulated dashboard (stat cards + progress bars inside browser chrome)
- ~~Fix Workflow Animation~~ — switched from `useInView`+`animate` to `whileInView` pattern; all 5 stages now render
- ~~Tighten vertical spacing~~ — reduced from py-28 to py-20 across all sections
- ~~Add favicon~~ — teal shield SVG favicon added via Next.js metadata
- ~~Enrich footer~~ — added ShieldIcon + brand tagline, Product links, Company links (no social links per preference)
- ~~Redesign Trust Signals~~ — customer-facing metrics (10K+ users, 50% reduction, <5min, 100% audit trail) + 4 compliance badges (SOC 2, GDPR, ISO 27001, NIST CSF)
- ~~Update demo form header~~ — "See Provisum in Action" / "Book a Demo"
- **Remaining:** Accessibility pass (contrast on gray subtext, ROI formula text size), OG image

---

## Deferred — Keep in Roadmap

These are valuable features that are not prioritised for the current sprint. They remain in the roadmap for future scheduling.

### ~~Resend integration (email transport)~~ ✅ COMPLETE
- ~~**Resend domain verification**~~ ✅ `provisum.io` verified in Resend dashboard
- ~~**Sales site lead notifications**~~ ✅ Live — leads send to `jacobrtaylor@gmail.com` from `Provisum <leads@provisum.io>`
- ~~**Product app invite emails**~~ ✅ `lib/email.ts` built with Resend client, `sendInviteEmail()` function. Works when `RESEND_API_KEY` is set (Owner Action #4)
- ~~**Coordinator email notifications**~~ ✅ Wired into coordinator notification flow
- ~~**Admin email settings**~~ ✅ Email tab in admin console: enabled toggle, from address, from name, reply-to, test email, API key status
- Scope remaining: undeliverable handling

### Target system security design integration adapter (evergreen role library) — FRAMEWORK COMPLETE
- ~~**Adapter interface**~~ ✅ `lib/adapters/target-system-adapter.ts` — TypeScript interface
- ~~**Mock SAP adapter**~~ ✅ `lib/adapters/mock-sap-adapter.ts` — 9 SAP roles with real transaction codes
- ~~**Adapter registry**~~ ✅ `lib/adapters/index.ts` — factory pattern
- ~~**API routes**~~ ✅ test-connection, pull, changes (accept/dismiss)
- ~~**Admin UI**~~ ✅ `/admin/security-design` page with connection test, pull, diff review, history
- Scope remaining: Real SAP/Workday/ServiceNow/Oracle adapters (blocked on client environment access)

### ~~Target system provisioning adapter~~ — DEFERRED (until real customer conversation)

### ~~AI confidence calibration~~ ✅ DONE
- `/calibration` page with threshold slider, confidence badges, bulk accept
- API routes for fetch + patch (accept/reassign/remove)
- Lumen tool: `get_calibration_summary`

### ~~AI-assisted mapping suggestions~~ ✅ DONE
- AI reasoning engine (`lib/ai/mapping-suggestions.ts`) using Claude to rank candidates
- Composite confidence: AI (60%) + permission overlap (30%) + historical acceptance (10%)
- Feedback loop via `mapping_feedback` table — learns from accepted/rejected mappings
- "AI Suggest" button in mapping UI with modal, confidence badges, reasoning display
- API: `GET /api/mapping/ai-suggestions`, `POST /api/mapping/ai-suggestions/feedback`

### ~~Webhook event layer~~ ✅ DONE
- 11 event types, HMAC-SHA256 signed, fire-and-forget dispatch
- Auto-disable after 10 consecutive failures
- Admin UI panel in admin console
- Wired into 7 workflow routes

### Automated technical support / self-healing — PHASE 1 COMPLETE
- ~~**Phase 1 (MVP):** Error detection → agent classification → notification with suggested fix~~ ✅ DONE
  - `incidents` table (17 columns), `lib/incidents/detection.ts` (deduplication), `lib/incidents/triage.ts` (Claude AI classification)
  - Wired into: job-runner (dead-letter), health check (degraded), webhooks (auto-disabled)
  - Admin UI at `/admin/incidents` — incident list, AI triage card, re-triage, resolution form, create form
- **Phase 2:** Auto-remediation for low-risk, known-pattern failures (expired tokens, config drift, cache invalidation). Pattern library built from real incident history.
- **Phase 3:** Full closed-loop remediation with approval workflows for medium/high-risk actions.
- **Blocked on:** Production incident volume to build the pattern library. Revisit after first enterprise deployments generate real failure data.

### ~~ML confidence enrichment layer (XGBoost sidecar)~~ — DEFERRED (until real customer conversation)
- Prototype complete, model code in `ml/`. See `ml/ML_CONFIDENCE_ENRICHMENT.md`.

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
| **E2E QA pass: 186 tests, 139 pass, 3 HIGH fixed (Run Pipeline role-gate, public Quick Ref, branded 404)** | v0.6.0 |
| **Tech debt: centralized constants, auth guard helper, env validation, CSP tightened** | v0.6.0 |
| **Supabase Postgres migration (SQLite → Supabase pooler, Drizzle pgTable)** | v0.7.0 |
| **Supabase Auth migration (JWT sessions, 17 auth users, RLS on 39 tables)** | v0.7.0 |
| **Risk Quantification Dashboard + /risk-analysis page** | v0.7.0 |
| **Coordinator Due Dates on releases (mapping/review/approval deadlines)** | v0.7.0 |
| **AI Pipeline full run: 1K users → 20 personas → 37 mappings → 2130 assignments → 1173 SOD conflicts** | v0.7.0 |
| **Vercel deployment + custom domains (demo.provisum.io, app.provisum.io)** | v0.7.0 |
| **GitHub auto-deploy (push to main → Vercel production)** | v0.7.0 |
| **Provisum sales site (provisum.io) — 10-section marketing page, leads API, Supabase leads table** | v0.7.0 |
| **Sales site design polish — static demo preview, workflow fix, trust signals, favicon, footer, spacing** | v0.7.0 |
| **Tech debt sprint: queries split (11 modules), N+1 fix, middleware hardened, scoped queries push to DB** | v0.7.0 |
| **QA bug fixes: login redirect race condition, dashboard error boundary, demo.pm account** | v0.7.0 |
| **Database indexes: 56 indexes across 39 tables for hot query paths** | v0.7.0 |
| **Sentry error tracking: @sentry/nextjs installed, client/server/edge configs, monitoring.ts wired** | v0.7.0 |
| **Vitest test infrastructure: 41 smoke tests across auth, settings, strapline, middleware** | v0.7.0 |
| **User invite flow: single invite, bulk CSV, accept, resend — Resend email integration** | v0.7.0 |
| **Resend email: domain verified, sales site lead notifications live, product app lib/email.ts built** | v0.7.0 |
| **Feature flags system (DB-backed, role/user/percentage targeting, admin UI)** | v0.8.0 |
| **Webhook event system (11 types, HMAC-SHA256, admin UI, delivery log)** | v0.8.0 |
| **Scheduled exports (daily/weekly/monthly, Vercel cron, admin UI)** | v0.8.0 |
| **AI confidence calibration queue (/calibration page, threshold slider)** | v0.8.0 |
| **Lumen Phase 3: RAG knowledge base (10 domain chunks, keyword+page scoring)** | v0.8.0 |
| **Lumen Phase 4: Chat history persistence (conversations table, sidebar, auto-save)** | v0.8.0 |
| **Multi-tenant org isolation Phase 1 (organizations table, org_id on entities)** | v0.8.0 |
| **OpenAPI 3.1 spec (68 routes, 90 operations, served at /api/docs/openapi)** | v0.8.0 |
| **Email notifications (Resend integration wired into coordinator notifications)** | v0.8.0 |
| **AI-assisted mapping v2 (Claude reasoning, composite confidence, feedback loop, UI modal)** | v0.9.0 |
| **Multi-tenant Phase 2+3 (44 queries org-scoped, organization_id NOT NULL, 16 insert sites fixed)** | v0.9.0 |
| **Target system adapter framework (interface, mock SAP adapter, admin UI, diff review)** | v0.9.0 |
| **Lumen Phase 5: 5 write-action tools (create mapping, resolve SOD, accept calibration, submit review, send reminder)** | v0.9.0 |
| **Resend email admin settings (Email tab, configurable from/reply-to, test email)** | v0.9.0 |
| **Automated support Phase 1 (incident detection, AI triage, admin UI, wired into job-runner/health/webhooks)** | v0.9.0 |
| **Playwright E2E tests (66 tests, 9 spec files — auth, dashboard, workflow, approvals, role matrix, admin, notifications, errors)** | v0.9.0 |
| **Sales site accessibility (WCAG contrast fixes, OG image, Twitter cards)** | v0.9.0 |
| **DB migration: mapping_feedback + incidents tables created, org_id backfill verified** | v1.0.0 |
| **Migration Health Dashboard (`/admin/migration-health`) — 6 KPI cards, pipeline visualization, confidence distribution** | v1.0.0 |
| **Release Readiness Checklist — collapsible 8-check panel on each release card (scope, assignments, SOD, approval, deadlines)** | v1.0.0 |
| **Confidence Distribution Chart — histogram on `/calibration` with 10 buckets, avg score, server-rendered** | v1.0.0 |
| **SOD Conflict Heatmap — department × severity matrix on `/sod` with color-coded intensity** | v1.0.0 |
| **Admin Activity Pulse — last 24h/7d action counts, top actions breakdown, recent activity feed on `/admin`** | v1.0.0 |
| **Within-Role SOD Intelligence — structural violation queries, Role Integrity tab, differentiated remediation paths, SOD badges on target roles, Risk Analysis 4th card** | v1.0.0 |
| **Remapping Workflow — `remap_required` status, 3-option mapper UI, Re-mapping Queue on `/mapping`, admin post-redesign config** | v1.0.0 |
| **SOD Triage Workspaces — `compliance_officer` + `security_architect` roles, `security_work_items` table, Compliance Workspace, Security Workspace, 5 API routes, notifications, audit events** | v1.0.0 |
| **Source/Target System Typing — `system-context.ts` (10 source + 7 target types), release UI dropdowns, AI pipeline injection, system type badges** | v1.1.0 |
| **Permission Changes drill-down — bidirectional tracking (gained + reduced), per-user detail modal with persona/perm counts** | v1.1.0 |
| **In-App Knowledge Base — `/help` + `/help/[slug]`, 10 role-aware articles, search, category filtering, Lumen integration** | v1.1.0 |
| **SOX/ITGC Audit Evidence Package — 6-tab Excel (SOX 404 + SOC 2 CC6), `/admin/evidence-package`, generation history** | v1.1.0 |
| **App Modularization — tile-based module launcher (`/home`), 9 modules, scoped sidebars, cookie-based module context** | v1.1.0 |
| **Target Role Editing + Approval — draft/active/archived lifecycle, CRUD + approve/reject API, security_architect gated** | v1.2.0 |
| **Mitigating Controls — control description, owner, frequency on accepted SOD risks, "Controlled" badge** | v1.2.0 |
| **SSO/SAML MVP — `sso_configurations` table, admin SSO tab, domain lookup API, login SSO flow** | v1.2.0 |
| **Security Design Export — 3-sheet Excel (Role Catalog, Permission Matrix, SOD Summary), teal headers, audit logged** | v1.2.0 |
| **Mapper Notifications — fire-and-forget notifications on role update/approval** | v1.2.0 |
| **RLS deny-all policies on all 57 tables (including evidence_package_runs, workstream_items)** | v1.2.0 |
| **35-item clickthrough fix sprint — SOD scoped delete, optimistic updates, remap queue, admin UX, navigation** | v1.3.0 |
| **Demo Environment Overhaul — glassmorphism login, persona pills, lead capture gate, hostname-based demo/prod** | v1.3.0 |
| **Existing Access labeling on SOD conflicts (blue "Existing Access" badge)** | v1.3.0 |
| **92 Vitest unit tests (51 new) + Playwright E2E stabilization** | v1.3.0 |
| **Sales site: legal pages (privacy, terms, security, DPA), cookie consent, ToS acceptance flow** | v1.3.0 |
| **Sales site: security headers (HSTS, CSP, X-Frame-Options), WCAG a11y, JSON-LD, sitemap (18+ pages)** | v1.3.0 |
| **Sales site: `/partners` page, pricing overhaul (Project License / Annual License model)** | v1.3.0 |
| **Sales site: competitive comparison page, ROI calculator, 10 SEO blog posts** | v1.3.0 |
| **All "beta" badges/references removed from product app and sales site** | v1.3.0 |
| **Vercel project cleanup — 3 projects (provisum-demo/sandbox/prod), old `airm` project deleted** | v1.3.0 |
| **IP-based rate limiting, Zod validation standardization, on-call runbook** | v1.3.0 |
