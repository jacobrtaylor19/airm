# Provisum — Intelligent Role Mapping

Provisum is an enterprise workflow tool for managing security role migrations (e.g. SAP ECC → S/4HANA). It uses AI to cluster users into security personas, maps those personas to target roles, runs SOD conflict analysis, quantifies risk, and routes the results through a structured mapper → approver workflow.

**Live:** [https://airm-beige.vercel.app](https://airm-beige.vercel.app)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, Server Components) |
| Database | Supabase Postgres via `postgres-js` + Drizzle ORM |
| Auth | Supabase Auth (`@supabase/ssr`, JWT sessions) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| Tables | TanStack React Table |
| Exports | `exceljs`, `pdfkit`, `csv-parse` |
| Hosting | Vercel (auto-deploy from GitHub) |

---

## Quick Start

```bash
pnpm install

# Push schema to Supabase and seed with demo data
pnpm db:push
pnpm db:seed

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
DATABASE_URL=postgresql://postgres.PROJECT_ID:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ANTHROPIC_API_KEY=<claude-api-key>
ENCRYPTION_KEY=<aes-256-gcm-key>
```

### Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| demo.admin | DemoGuide2026! | admin |
| demo.mapper.finance | DemoGuide2026! | mapper |
| demo.mapper.operations | DemoGuide2026! | mapper |
| demo.approver | DemoGuide2026! | approver |
| demo.viewer | DemoGuide2026! | viewer |
| demo.coordinator | DemoGuide2026! | coordinator |
| sysadmin | Sysadmin@2026! | system_admin |

### Demo Data Packs

```bash
pnpm db:seed -- --demo=sap-migration
```

9 demo environments available: SAP S/4HANA (default, energy-chemicals, consumer-products, financial-services, manufacturing), Oracle Fusion, Workday, Salesforce, ServiceNow.

---

## User Roles

| Role | Hierarchy | Description |
|------|-----------|-------------|
| `system_admin` | 100 | Full access including system config console and pipeline validation |
| `admin` | 80 | Full project access, user management |
| `approver` | 60 | Approves role assignments within their org unit scope |
| `coordinator` | 50 | View access + can send notifications to mappers/approvers |
| `mapper` | 40 | Maps personas to target roles within their org unit scope |
| `viewer` | 20 | Read-only access |

Mapper, approver, and coordinator roles are scoped to an org unit (`appUsers.assignedOrgUnitId`). All descendant org units in the hierarchy are included automatically.

---

## Workflow Stages

```
Upload → Personas → Mapping → SOD Analysis → Approval
```

1. **Upload** — Import users, source roles, target roles, and SOD rules via CSV/Excel
2. **Personas** — AI clusters users into security personas based on role patterns (2-phase: AI designs personas from 100-user sample, then programmatic assignment for all users)
3. **Role Mapping** — Mappers assign target roles to each persona; excess provisioning is flagged
4. **SOD Analysis** — Conflicts between assigned roles are detected against the SOD rulebook
5. **Approval** — Approvers review and approve/reject each user assignment

---

## Key Features

### Dashboard
- **Workflow stepper** showing progress across all 5 stages
- **Strapline** — opinionated, role-aware status summary
- **Risk Quantification** — 3 risk categories (Business Continuity, Adoption Risk, Incorrect Access)
- **Provisioning Alerts** — scoped to user's org unit, with inline accept/revoke
- **Department kanban** — per-department breakdown across all workflow stages

### Authentication & Security
- Supabase Auth with JWT sessions via `@supabase/ssr`
- Row-Level Security (RLS) enabled on all 39 tables
- 12-character password policy with complexity requirements
- Account lockout after 5 failed attempts
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- AES-256-GCM encryption for sensitive settings (API keys, tokens)

### Risk Analysis
- Dedicated `/risk-analysis` page with 3 risk category cards
- Flagged users table sorted by SOD conflict count
- Scope-aware: non-admin users see risk for their org unit only

### Releases & Due Dates
- Scoped migration waves with user and org unit assignment
- Phase deadlines (mapping, review, approval) with visual overdue indicators
- Existing production access from prior waves included in SOD analysis

### Pipeline Validation (Due Diligence)
- System-admin-only tool at `/admin/validation`
- Full attribution chain tracing: source attributes → persona → target roles → SOD conflicts
- Edge case detection, confidence histograms, persona distribution
- 5-tab Excel export for audit purposes

### Notifications (Demo Mode)
- Coordinators and admins can send in-app notifications
- 4 quick-message templates
- No email transport — stored in DB only

### Exports
- Full Excel Report (multi-sheet workbook with cover page)
- PDF Report
- CSV Provisioning Export
- SOD Conflict Report
- Permission Gap Analysis
- Audit Log Export

---

## Infrastructure

| Component | Service |
|-----------|---------|
| Hosting | Vercel (auto-deploy from `main` branch) |
| Database | Supabase Postgres (pooled connection, port 6543) |
| Auth | Supabase Auth (JWT, `@supabase/ssr`) |
| AI | Anthropic Claude API |
| Old URL redirect | Render static site → Vercel |

### Deployment

Push to `main` triggers automatic Vercel production deploy. Database is persistent — no re-seeding needed on deploy.

For initial setup:
1. Create Supabase project
2. Create Vercel project, set env vars
3. `pnpm db:push` to create tables
4. `pnpm db:seed` to seed demo data
5. Push to deploy

---

## Project Structure

```
airm/
├── app/                    # Next.js App Router pages (37+ routes)
│   ├── dashboard/          # Main dashboard (strapline, KPIs, risk cards, dept kanban)
│   ├── mapping/            # Role mapping workspace
│   ├── approvals/          # Approval queue
│   ├── sod/                # SOD conflict analysis
│   ├── risk-analysis/      # Risk quantification dashboard
│   ├── personas/           # Persona management
│   ├── releases/           # Release/wave management with due dates
│   ├── notifications/      # In-app notification inbox
│   ├── admin/              # User management, config console, pipeline validation
│   ├── exports/            # Export center
│   ├── login/              # Auth pages
│   └── api/                # API route handlers
├── components/
│   ├── layout/             # Sidebar, header, workflow stepper
│   ├── dashboard/          # KPI card
│   └── ui/                 # shadcn/ui components
├── db/
│   ├── schema.ts           # Drizzle schema (pgTable, 39 tables)
│   ├── index.ts            # Postgres connection (lazy proxy, prepare: false)
│   └── seed.ts             # Demo data seeder
├── lib/
│   ├── auth.ts             # Supabase Auth session management, role hierarchy
│   ├── scope.ts            # Org-unit-based user scoping
│   ├── queries.ts          # Shared DB queries (50+ functions)
│   ├── settings.ts         # getSetting / setSetting helpers
│   ├── strapline.ts        # Rule-based dashboard status generator
│   ├── supabase/           # Supabase client utilities (server, client, admin)
│   └── ai/                 # Claude API integration helpers
├── middleware.ts            # Supabase session refresh, route protection, security headers
├── docs/                   # Security controls, incident response, QA testing strategy
└── render-redirect/        # Static redirect page for old Render URL
```

---

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

| Version | Date | Highlights |
|---------|------|-----------|
| v0.7.0 | 2026-03-28 | Supabase Auth, RLS, Risk Dashboard, Due Dates, Vercel deploy |
| v0.6.0 | 2026-03-26 | Security hardening, GDPR, demo overhaul, 9 demo environments |
| v0.5.0 | 2026-03-26 | UX overhaul, AI chatbot, brand refresh to Provisum |
| v0.3.0 | Earlier | Auth, role scoping, notifications, provisioning alerts |
| v0.2.0 | Earlier | Cookie-based auth, role-based access |
| v0.1.0 | Earlier | Core workflow, AI personas, SOD analysis, exports |
