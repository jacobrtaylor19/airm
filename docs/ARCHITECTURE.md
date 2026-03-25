# AIRM Architecture

This document describes the system design, technical decisions, and component architecture for the AI Role Mapping Tool.

---

## System Overview

AIRM is a Next.js 14 web application that automates enterprise role migration workflows. The system ingests source user data and role hierarchies, uses Claude AI to cluster users into security personas, maps those personas to target roles, performs SOD conflict analysis, and routes the results through a structured approval workflow.

```
┌─────────────┐      ┌──────────────┐      ┌──────────┐      ┌────────────┐      ┌──────────┐
│   Upload    │─────>│   Personas   │─────>│ Mapping  │─────>│ SOD Check  │─────>│Approvals │
│ (CSV/Excel) │      │ (AI cluster) │      │ (manual) │      │ (rules)    │      │ (queue)  │
└─────────────┘      └──────────────┘      └──────────┘      └────────────┘      └──────────┘
     Stage 1             Stage 2               Stage 3            Stage 4            Stage 5
```

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 14 (App Router) | Server components for simple architecture; SSR for auth; App Router for flexible routing |
| **Database** | SQLite + Drizzle ORM | Single-file embedded DB for rapid development; no external dependency; Drizzle for type-safe queries |
| **AI SDK** | @anthropic-ai/sdk (claude-opus-4-6) | Fast, accurate clustering; cost-effective for persona generation; no training required |
| **UI** | shadcn/ui + Tailwind CSS | Pre-built, accessible components; rapid UI iteration; theming support |
| **Auth** | Cookie-based sessions + bcryptjs | Simple, stateless auth; httpOnly cookies prevent XSS; bcrypt for password hashing |
| **Tables** | TanStack React Table | Headless, flexible table library; supports sorting, filtering, pagination out-of-the-box |
| **Exports** | exceljs + pdfkit + csv-parse | Multi-format exports; Excel for bulk operations; PDF for reports; CSV for data interchange |

---

## Architecture Layers

### 1. Application Layer (Next.js Pages)

Pages are organized by feature and stage:

```
app/
├── dashboard/          # Main entry point; KPIs, strapline, dept kanban, provisioning alerts
├── mapping/            # Role assignment workspace (Stage 3)
├── approvals/          # Approval queue (Stage 5)
├── sod/                # SOD conflict analysis (Stage 4)
├── personas/           # Persona management and AI results
├── releases/           # Migration wave scoping
├── least-access/       # Full provisioning alert analysis (detail view)
├── notifications/      # In-app notification inbox
├── admin/              # User management + system configuration
├── login/              # Authentication
├── setup/              # First-run admin creation
└── api/                # API endpoints for mutations
```

**Key Pattern**: Pages are server components. They call database queries directly (no API round-trip for reads). Mutations go through `/api/**` routes.

```typescript
// Server component: direct DB access
export default function DashboardPage() {
  const user = requireAuth();
  const stats = getDashboardStats(); // synchronous
  return <Dashboard stats={stats} />;
}

// Client component: uses fetch for mutations
"use client";
export function ApproveButton({ assignmentId }: { assignmentId: number }) {
  const router = useRouter();
  const handleApprove = async () => {
    await fetch("/api/approvals/approve", {
      method: "POST",
      body: JSON.stringify({ assignmentId }),
    });
    router.refresh(); // Re-fetch server data
  };
}
```

### 2. API Layer (`/app/api`)

RESTful endpoints for mutations (writes). All endpoints validate the session user, check role-based access, and return JSON.

```
# Auth
POST /api/auth/login              # Authenticate with username/password
POST /api/auth/setup              # Create initial admin (first-run only)
POST /api/auth/logout             # Clear session cookie

# Admin
GET/POST        /api/admin/app-users          # App user CRUD
POST            /api/admin/bulk-delete        # Bulk delete source users
GET/POST/DELETE /api/admin/assignments        # Work assignment CRUD
GET/POST        /api/settings                 # System settings (key-value)

# AI processing
POST /api/ai/persona-generation     # Trigger Claude persona clustering
POST /api/ai/persona-assignment     # AI-assisted user → persona assignment
POST /api/ai/target-role-mapping    # AI-assisted persona → target role mapping
POST /api/ai/end-user-mapping       # AI-assisted direct user mapping

# Mapping & approvals
POST /api/mapping/persona-roles            # Save persona → target role mappings
POST /api/approvals/approve                # Approve an assignment
POST /api/approvals/send-back              # Send assignment back for revision
POST /api/approvals/bulk-approve          # Bulk approve assignments

# SOD
POST /api/sod/analyze                      # Run SOD conflict analysis
POST /api/sod/accept-risk                  # Accept a SOD conflict with justification
POST /api/sod/escalate                     # Escalate SOD conflict for review
POST /api/sod/fix-mapping                  # Fix mapping to resolve SOD conflict
POST /api/sod/request-risk-acceptance      # Request risk acceptance from approver

# Provisioning alerts
POST   /api/least-access/exceptions        # Accept over-provisioning exception
DELETE /api/least-access/exceptions        # Revoke exception

# Releases
GET/POST/PATCH/DELETE /api/releases        # Migration wave / release management

# Notifications
POST /api/notifications                    # Send notifications

# Exports
GET /api/exports/provisioning              # Provisioning export (CSV)
GET /api/exports/excel                     # Full data export (Excel)
GET /api/exports/pdf                       # Report export (PDF)
GET /api/exports/sod-exceptions            # SOD exceptions export

# Upload
POST /api/upload/[type]                    # Upload CSV/Excel data files

# Utilities
GET /api/org-hierarchy                     # Fetch org unit tree
POST /api/refinements/save                 # Save AI refinement feedback
POST /api/demo/switch                      # Switch demo mode (dev only)
```

### 3. Business Logic Layer (`/lib`)

Core functions and utilities:

| Module | Responsibility |
|--------|-----------------|
| `auth.ts` | Session management, role hierarchy, permission checks |
| `scope.ts` | Org-unit-based user filtering and department resolution |
| `queries.ts` | Shared database queries (centralized to avoid duplication) |
| `settings.ts` | Key-value project configuration (persistent in DB) |
| `strapline.ts` | Rule-based dashboard status messages (no AI calls) |
| `ai/` | Claude API integration for persona generation and analysis |
| `utils.ts` | Utility functions (cn, formatting, etc.) |

**Key Pattern**: Business logic is synchronous. Database queries use Drizzle's query builder (not raw SQL).

```typescript
// In lib/queries.ts — centralized, reusable
export function getDashboardStats(userId?: number) {
  const user = userId ? getAppUser(userId) : requireAuth();
  const scopedUserIds = getUserScope(user);

  const uploadedCount = db.select({ count: sql`count(*)` })
    .from(schema.users)
    .where(scopedUserIds ? inArray(schema.users.id, scopedUserIds) : undefined)
    .get();
  // ... more aggregations
}
```

### 4. Data Access Layer (Drizzle + SQLite)

**Schema** (`db/schema.ts`): Single source of truth for all tables. Drizzle ORM maps TypeScript types to SQL.

```typescript
export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  username: text("username").notNull(),
  email: text("email"),
  // ...
});

export const personas = sqliteTable("personas", {
  id: integer("id").primaryKey(),
  projectId: integer("project_id"),
  name: text("name").notNull(),
  description: text("description"),
  // ...
});
```

**Query Pattern**: Always use `.get()` for single rows, `.all()` for multiple.

```typescript
// Single row
const user = db.select().from(schema.appUsers).where(eq(schema.appUsers.id, 1)).get();

// Multiple rows
const users = db.select().from(schema.users).where(inArray(schema.users.id, [1, 2, 3])).all();
```

**Features**:
- Foreign keys enabled (deletes may cascade)
- WAL mode for concurrency
- Synchronous queries (no async/await needed)
- Database file: `airm.db` (gitignored, created on first run)

---

## Data Flow: Role Mapping Workflow

### Stage 1: Upload
User uploads CSV/Excel files containing:
- `users` — source user records (ID, name, department, job title, org unit, source roles)
- `sourceRoles` — legacy role catalog
- `targetRoles` — target role catalog
- `sodRules` — SOD conflict rulebook

**Action**: Parsed and inserted into database. No transformation yet.

### Stage 2: Personas (AI-Powered)
Claude API clusters users into security personas based on shared permission patterns.

**Flow**:
1. Extract all user source role assignments from database
2. Call Claude (`lib/ai/generatePersonas.ts`):
   - Input: User IDs + source roles
   - Prompt: Ask Claude to group users with similar access needs
   - Output: Named personas with characteristic roles and user assignments
3. Store personas and `userPersonaAssignments` (with confidence score) in database
4. Compute `personaSourcePermissions` (weighted characteristics)

**AI Integration Details** (`lib/ai/`):
```typescript
// Client creates prompt with user data
const prompt = `Given these users and their roles, cluster into personas...`;
const response = await anthropic.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 4000,
  messages: [{ role: "user", content: prompt }],
});

// Parse Claude's response into structured format
const personas = parseClaudeResponse(response);

// Store in DB with confidence metadata
for (const { users, name, rationale } of personas) {
  const personaId = createPersona(name, rationale);
  for (const user of users) {
    recordUserPersonaAssignment(user.id, personaId, user.confidence);
  }
}
```

### Stage 3: Mapping
Mappers manually assign each persona to one or more target roles.

**Action**: User selects persona → selects target role(s) → system computes coverage and excess provisioning.

**Computation**:
- `coveragePercent` = (users mapped / total users in persona) × 100
- `excessPercent` = (target role size / persona size) × 100 (indicates over-provisioning)

**Storage**: `personaTargetRoleMappings` (persona ID + target role + coverage/excess %)

### Stage 4: SOD Analysis
System detects conflicts between assigned roles against the SOD rulebook.

**Flow**:
1. Fetch SOD rules from `sodRules` table
2. For each user assignment, check if assigned roles conflict
3. Store violations in `sodConflicts` (severity: critical / high / medium / low)
4. Display conflicts by user (grouped by severity)

**Conflict Resolution**:
- Conflicts block approval until user is reassigned or exception is accepted
- Approver can review conflict and accept (with optional justification)

### Stage 5: Approval
Approvers review assignments and approve/reject.

**Action**: Approver reviews user + assigned roles + SOD conflicts → clicks Approve or Reject.

**Storage**: `userTargetRoleAssignments` (status: pending / approved / rejected)

---

## Role-Based Access Control

**Hierarchy** (higher = more permissions):

```
system_admin (100)
    └─ admin (80)
        ├─ approver (60) [scoped]
        ├─ coordinator (50) [scoped]
        └─ mapper (40) [scoped]
             └─ viewer (20)
```

**Role Definitions**:

| Role | Use Case | Scope |
|------|----------|-------|
| `system_admin` | Infrastructure / system configuration | Global |
| `admin` | Project lead / migration manager | Global |
| `approver` | SAP architect or compliance | Org-unit subtree |
| `coordinator` | Migration coordinator | Org-unit subtree |
| `mapper` | Power user assigning roles | Org-unit subtree |
| `viewer` | Read-only (stakeholder review) | Global |

**Scoping**: Mapper, approver, and coordinator see only users in their assigned org unit subtree.

```typescript
// lib/scope.ts
export function getUserScope(appUser: AppUser): number[] | null {
  // admin, system_admin, and viewer have no scope restriction — they see all users
  if (["admin", "system_admin", "viewer"].includes(appUser.role)) {
    return null; // null means "no filter — return all users"
  }

  // mapper, approver, coordinator: resolve org unit subtree and return
  // the IDs of all users within it (using getDescendantOrgUnitIds)
  const ouIds = getDescendantOrgUnitIds(appUser.assignedOrgUnitId);
  return getUsersInOrgUnitSubtree(ouIds);
}
```

---

## Org-Unit Hierarchy

Users and org assignments are organized in a 3-level hierarchy:

```
L1 (Company Division)
├─ L2 (Department)
│  ├─ L3 (Sub-department)
│  └─ L3 (Sub-department)
└─ L2 (Department)
   ├─ L3 (Sub-department)
   └─ L3 (Sub-department)
```

**Storage**: `orgUnits` table with parent_id for tree traversal.

**Scoping**: When a mapper is assigned to L2, they see all users in that L2 and its L3 descendants.

---

## Authentication & Sessions

**Flow**:
1. User submits username + password to `/api/auth/login`
2. Server hashes password with bcryptjs and compares to stored hash
3. On match: create session token, set `airm_session` cookie (httpOnly, 24h expiry)
4. Middleware validates cookie on every request
5. Pages and API routes call `requireAuth()` or `getSessionUser()`

**Session Cookie**:
```
Name: airm_session
Value: <session token>
HttpOnly: true (prevents JavaScript access)
Secure: true (HTTPS only in production)
SameSite: strict (prevents CSRF)
Max-Age: 86400 (24 hours)
```

**First Run**:
- No users exist yet
- User is redirected to `/setup` to create initial admin
- After setup, `/setup` is locked (first admin already exists)

---

## Notifications (Demo Mode)

Currently, notifications are **demo-only** (stored in DB, no email sent).

**Flow**:
1. Coordinator/admin navigates to Send Notification
2. Selects recipient(s) and message template (or custom text)
3. POSTs to `/api/notifications` with `{ toUserIds: [...], message: "..." }`
4. Record inserted into `notifications` table
5. Recipients see unread badge in sidebar + can view in `/notifications` inbox

**Templates** (`lib/strapline.ts`):
- "mapping pending" — Mapper has pending tasks
- "approval pending" — Approver has items in queue
- "SOD review" — Conflicts need resolution
- "over-provisioning" — Excess provisioning alert

**Future Enhancement** (in ROADMAP): Wire email transport (Resend, SendGrid) so notifications are sent out-of-band.

---

## Provisioning Alerts

Surfaces mappings where a persona is mapped to a role significantly larger than needed.

**Computation**:
```
excessPercent = (target role users / persona users) × 100

if excessPercent > threshold (default 30%):
  → Flag as "Provisioning Alert"
```

**UI**:
- **Dashboard**: Scoped alerts for user's org unit (inline accept/revoke)
- **Detail page**: `/least-access` shows full analysis across all org units

**Exception Handling**:
- Approver/admin can accept exception with justification (stored in `leastAccessExceptions`)
- Exception recorded in audit log
- Alert no longer blocks approval

---

## Dashboard & Strapline

**Dashboard** (`app/dashboard/page.tsx`):
- **KPI Cards**: Workflow stage progress (upload → personas → mapping → SOD → approvals)
- **Strapline**: Opinionated, role-aware status message (see below)
- **Department Kanban**: Per-department breakdown across all stages
- **Provisioning Alerts**: Scoped to user's org unit with inline accept/revoke

**Strapline** (`lib/strapline.ts`):

Rule-based status generator (no AI) that identifies the critical path and tells users what to do:

```typescript
// Examples:
"15 assignments are stuck waiting for approvals — this is the critical path right now."
"Good news: all users are mapped. 3 conflicts need review before going live."
"2 mappers are behind. Consider reassigning work to stay on schedule."
```

**Rules** (simplified):
1. Find the stage with the highest incomplete percentage
2. If >50% of that stage is pending, it's the bottleneck
3. Compose a message that names the bottleneck and suggests action
4. Color code: green (on track), yellow (warning), red (critical)

---

## Settings & Configuration

Project-wide settings are stored in `systemSettings` table (key-value pairs).

**Accessible via Admin Console**:

| Key | Description | Default |
|-----|-------------|---------|
| `project_name` | Display name in header/sidebar | `AIRM` |
| `least_access_threshold` | Over-provisioning alert threshold (%) | `30` |
| `confidence_threshold` | Min Claude confidence for auto-assignment | `65` |
| `sod_auto_reject_threshold` | SOD severity that auto-rejects | — |

**Usage**:
```typescript
import { getSetting, setSetting } from "@/lib/settings";

const threshold = parseInt(getSetting("least_access_threshold") ?? "30", 10);
setSetting("project_name", "SAP ECC → S/4HANA Migration");
```

---

## Key Design Decisions

### 1. SQLite + Drizzle (not PostgreSQL)
**Decision**: Embed SQLite for rapid development; no external DB dependency.

**Trade-off**: SQLite is single-writer (WAL mode helps). For true concurrency at scale, future migration to PostgreSQL would be needed.

**Rationale**: MVP speed; suitable for migration projects (single project instance, bounded concurrent users).

### 2. Server Components (not API-first SPA)
**Decision**: Use Next.js server components for data fetching; pages call DB directly.

**Trade-off**: Less fine-grained API contract; tighter coupling between pages and DB.

**Rationale**: Simpler architecture; faster initial build; no N+1 overhead from separate API calls.

### 3. Claude API for Personas (not Local ML)
**Decision**: Use Claude API; no local model training.

**Trade-off**: Requires API calls; cost per run (though modest).

**Rationale**: No infrastructure for ML ops; Claude's accuracy is high; cost is acceptable for batch clustering.

### 4. Cookie-Based Auth (not JWT/OAuth)
**Decision**: Simple httpOnly session cookies; stateless middleware validation.

**Trade-off**: Cookies are browser-only; no mobile app support without changes.

**Rationale**: Enterprise web app (browser-based); sufficient security; no third-party IdP complexity in MVP.

### 5. Role Hierarchy (not Fine-Grained Permissions)
**Decision**: 6-level role hierarchy; data scoping by org unit.

**Trade-off**: Coarser than RBAC; no per-feature toggles.

**Rationale**: Enterprise roles map naturally; org-unit scoping covers most delegation patterns.

### 6. No Multi-Tenancy (v1)
**Decision**: Single project instance per deployment.

**Trade-off**: Not suitable for SaaS; consultants would need separate instances.

**Rationale**: MVP is for single enterprise migration; multi-tenancy is future roadmap item.

---

## Deployment & Operations

**Current Hosting**: Render.com (free tier or paid plan)

**Deployment Strategy**:
- GitHub repo → Render webhook → Auto-deploy on push to `main`
- Database (`airm.db`) lives in Render's `/data` persistent volume
- Environment variables (Claude API key) set in Render dashboard

**Considerations**:
- Cold starts on free tier (~30s)
- Database file persists across deploys (in `/data`)
- Monitor Render logs for errors

See `DEPLOYMENT.md` for detailed setup and operations procedures.

---

## Future Architecture Considerations

1. **Multi-Tenancy**: Add project ID to all queries; separate databases per tenant or shared DB with scoping
2. **Async Jobs**: Use job queue (Bull, Bee-Queue) for long-running operations (persona generation)
3. **API Webhooks**: Expose REST API + webhooks for GRC tool integration
4. **Audit Trail**: Expand audit log with detailed change tracking (currently basic)
5. **Caching**: Add Redis for session storage and query caching at scale
6. **Analytics**: Track usage patterns and persona quality metrics
