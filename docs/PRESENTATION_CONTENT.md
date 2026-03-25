# AIRM — Presentation Slide Content

Structured content for building presentation decks. Each section is a self-contained deck.

---

## Deck 1: Executive Overview — "What is AIRM?"

**Audience:** Stakeholders, project sponsors, business leads

---

### Slide 1 — The Problem

**Title:** Enterprise Role Migration is Manual, Risky, and Slow

**Body:**
- Large ERP migrations (ECC → S/4HANA) require re-assigning access rights for hundreds or thousands of users
- Manual processes rely on spreadsheets, email chains, and tribal knowledge
- Risk: over-provisioning access, SOD conflicts, compliance violations
- Result: delayed go-lives, audit failures, and security gaps

**Speaker notes:** The typical migration involves 3–6 months of role mapping work, often done by consultants with limited knowledge of actual user behaviour.

---

### Slide 2 — The Solution

**Title:** AIRM: AI-Assisted Role Mapping for ERP Migrations

**Body:**
- AI groups users into **security personas** based on their actual role patterns — not job titles
- Mappers assign target roles to personas (not individual users) — drastically reducing the workload
- Built-in SOD rulebook analysis flags conflicts before they reach approvers
- Structured approval workflow with full audit trail

**Visual suggestion:** Simple left-to-right flow: Source System → AI → Personas → Target Roles → Approved

---

### Slide 3 — Key Benefits

**Title:** What AIRM Delivers

| Benefit | Detail |
|---------|--------|
| Speed | Persona-based mapping reduces work by up to 80% vs. user-by-user |
| Accuracy | AI finds permission patterns humans miss in large datasets |
| Compliance | SOD analysis and least-privilege alerts built into the workflow |
| Traceability | Every decision is logged with approver, timestamp, and reasoning |
| Scalability | Works across multiple migration waves and org structures |

---

### Slide 4 — The 5-Stage Workflow

**Title:** AIRM Workflow

```
[1. Upload] → [2. Personas] → [3. Mapping] → [4. SOD Analysis] → [5. Approval]
```

| Stage | What happens |
|-------|-------------|
| Upload | Import users, source roles, target roles, SOD rules |
| Personas | AI clusters users into named security personas |
| Mapping | Mappers assign S/4HANA roles to each persona |
| SOD Analysis | Automated conflict detection against rulebook |
| Approval | Approvers review and sign off per user |

---

### Slide 5 — Live Dashboard

**Title:** Real-Time Project Visibility

**Body:**
- Per-department progress kanban (No Persona → Persona → Mapped → SOD Clean → Approved)
- Intelligent status strapline — tells the project team exactly what needs to happen next
- Provisioning alerts for over-assigned roles
- Role-scoped views: each user sees only their area of responsibility

**Visual suggestion:** Screenshot of dashboard with callouts on strapline, kanban, and KPI cards

---

---

## Deck 2: Architecture

**Audience:** Technical leads, architects, IT

---

### Slide 1 — Tech Stack

**Title:** Architecture Overview

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Server components, no extra API layer for reads |
| Database | SQLite + Drizzle ORM | Self-contained, zero-dependency deployment |
| AI | Anthropic Claude API | Best-in-class reasoning for persona clustering |
| Auth | Cookie sessions + bcryptjs | Simple, secure, no external auth service needed |
| UI | shadcn/ui + Tailwind CSS | Consistent, accessible, rapid development |
| Exports | exceljs, pdfkit, csv | Multi-format output for downstream systems |

---

### Slide 2 — System Architecture

**Title:** How the Pieces Fit Together

```
Browser
  └── Next.js App Router
        ├── Server Components (pages) — direct DB reads
        ├── Client Components — interactive UI, optimistic updates
        ├── API Routes — mutations, AI calls, exports
        └── Middleware — session validation, redirects

Application
  ├── lib/auth.ts         — sessions, role hierarchy
  ├── lib/scope.ts        — org-unit-based data scoping
  ├── lib/queries.ts      — shared Drizzle queries
  ├── lib/settings.ts     — project configuration
  ├── lib/strapline.ts    — rule-based status generation
  └── lib/ai/             — Claude API integration

Data Layer
  └── SQLite (airm.db)    — single file, WAL mode, FK enforced
```

---

### Slide 3 — Data Model (simplified)

**Title:** Core Data Entities

```
orgUnits (hierarchy)
    └── users (source users)
              └── userSourceRoleAssignments → sourceRoles
              └── userPersonaAssignments → personas
                        └── personaTargetRoleMappings → targetRoles
                                └── userTargetRoleAssignments (approval status)

appUsers (tool users)
    └── assignedOrgUnitId → orgUnits
    └── workAssignments (legacy scope)
```

Key junction tables: `userSourceRoleAssignments`, `userPersonaAssignments`, `personaTargetRoleMappings`, `userTargetRoleAssignments`

---

### Slide 4 — AI Integration

**Title:** How Claude Powers AIRM

**Persona Generation:**
1. Extract each user's source role portfolio → convert to permission fingerprint
2. Submit to Claude with project context (business function, org unit, job title)
3. Claude reasons over permission overlap and assigns a named persona with confidence score
4. Low-confidence assignments are flagged for human review

**Role Mapping Assistance:**
- Coverage % and excess % computed by comparing persona permissions against target role permissions
- AI-suggested mappings can be reviewed and overridden by mappers

**No hallucination risk for approvals:** All approval decisions are made by humans — AI is advisory only.

---

### Slide 5 — Security & Auth

**Title:** Access Control Model

- 6-role hierarchy: `system_admin` → `admin` → `approver` → `coordinator` → `mapper` → `viewer`
- Cookie-based sessions (httpOnly, 24h expiry)
- Org-unit scoping: mappers/approvers/coordinators only see users in their assigned subtree
- All mutations require authentication and role validation at the API layer
- Audit log captures every state change with actor and timestamp
- Passwords hashed with bcryptjs (no plaintext storage)

---

---

## Deck 3: Workflow Deep Dive

**Audience:** Implementation team, project managers

---

### Slide 1 — Stage 1: Data Upload

**Title:** Getting Data In

**What gets uploaded:**
- **Users** — name, email, department, job title, org unit, cost centre
- **Source roles** — SAP ECC role names, domain, role type
- **Source permissions** — T-codes and permission objects with risk level
- **Target roles** — S/4HANA role catalogue (Tier 3 security roles + Tier 2 task roles)
- **SOD rules** — segregation of duties rulebook with severity levels
- **Existing access** — prior wave assignments for SOD carryover analysis

**Formats supported:** CSV, Excel (.xlsx)

---

### Slide 2 — Stage 2: Persona Generation (AI)

**Title:** From Users to Personas

**The problem personas solve:**
- 500 users in Finance may have 200 distinct role combinations
- Mapping each user individually is impractical
- Personas collapse similar users into named security archetypes

**How it works:**
1. AI analyses each user's full permission portfolio
2. Users with similar access patterns are grouped into a consolidated group
3. A named persona is generated per group (e.g. "AP Processor", "Finance Controller")
4. Each assignment includes a confidence score and AI reasoning
5. Assignments below threshold (default: 65%) are flagged for manual review

**Output:** 500 users → typically 10–30 distinct personas

---

### Slide 3 — Stage 3: Role Mapping

**Title:** Mapping Personas to Target Roles

**Mapper's job:**
- For each persona, select one or more S/4HANA target roles
- The system shows: coverage % (how much of the persona's permissions are covered) and excess % (how much extra access the target role grants)
- Over-provisioned mappings (excess > threshold) are highlighted in orange

**Provisioning Alerts:**
- Mappings exceeding the excess threshold appear in the dashboard Provisioning Alerts section
- Approvers and admins can accept exceptions with a documented justification
- Exception decisions are logged with acceptor and timestamp

**Coordinator visibility:**
- Coordinators have read-only view of mapping progress
- Can send in-app notifications to mappers with action reminders

---

### Slide 4 — Stage 4: SOD Analysis

**Title:** Segregation of Duties Conflict Detection

**What SOD analysis does:**
- Compares each user's assigned target roles against the SOD rulebook
- Flags any pair of roles that violate a rule (e.g. "can create and approve the same PO")
- Severities: Critical / High / Medium / Low

**Conflict resolution options:**
- Remove one of the conflicting roles
- Accept with documented business justification (compliance exception)
- Route to compliance team for sign-off

**Critical and high conflicts block approvals** until resolved. Medium/low can proceed.

---

### Slide 5 — Stage 5: Approvals

**Title:** The Approval Queue

**How approvals work:**
1. Once mapping is complete and SOD is clean, assignments enter "ready for approval"
2. Approvers see only users in their assigned org unit
3. Each assignment shows: user, target role, persona, confidence, any SOD notes
4. Approver can approve, reject, or escalate
5. Approved assignments generate the provisioning export

**Output:** CSV/Excel export of user → S/4HANA role assignments, ready for import into the target system.

---

---

## Deck 4: AIRM User Personas (App Users)

**Audience:** Change management, training, business stakeholders

---

### Slide 1 — Who Uses AIRM?

**Title:** AIRM User Roles

6 roles with different responsibilities and data access:

| Role | Count (typical) | Primary job |
|------|----------------|-------------|
| System Admin | 1–2 | Configure the tool, manage releases |
| Admin | 2–4 | Manage app users, oversee project |
| Approver | 5–15 | Review and approve role assignments |
| Coordinator | 3–8 | Monitor progress, chase mappers/approvers |
| Mapper | 10–30 | Assign target roles to personas |
| Viewer | Unlimited | Read-only visibility |

---

### Slide 2 — The Mapper

**Title:** Mapper — "I own the role mapping"

**Assigned to:** Org unit (department cluster)
**Sees:** Only users and personas in their assigned area

**Daily workflow:**
1. Log in → dashboard shows their area status strapline
2. Go to Role Mapping → filter to unmapped personas
3. For each persona, review permissions and select the best-fit S/4HANA role(s)
4. Submit — assignment goes to SOD check, then to approver queue

**Pain points AIRM solves:**
- No spreadsheet juggling — all context in one place
- Coverage and excess % shown instantly
- Can see what other personas in their group are mapped to

---

### Slide 3 — The Approver

**Title:** Approver — "I sign off on access decisions"

**Assigned to:** Org unit (same level as mapper)
**Sees:** Only assignments for users in their area

**Daily workflow:**
1. Log in → dashboard strapline shows pending approval count
2. Go to Approvals → review each user assignment
3. Check: persona match, role coverage, SOD status
4. Approve or reject with optional comments

**What the approver is accountable for:**
- Confirming the persona assignment is correct for the user
- Confirming the target role is appropriate for the persona
- Accepting any compliance exceptions

---

### Slide 4 — The Coordinator

**Title:** Mapping Coordinator — "I keep the project moving"

**Assigned to:** Org unit (typically same level as approver)
**Sees:** Read-only view of their area — users, personas, mapping status, approvals

**Responsibilities:**
- Monitor mapping and approval progress across their departments
- Identify blockers (stalled mappers, overdue approvals)
- Send targeted in-app notifications to mappers or approvers
- Escalate issues to admin/project lead

**Notification templates available:**
- Mapping Pending reminder
- Approval Pending reminder
- SOD Review required
- Over-Provisioning Review

---

### Slide 5 — The Admin

**Title:** Admin — "I run the project"

**Sees:** Everything — all departments, all users, all stages

**Responsibilities:**
- Create and manage AIRM app user accounts
- Assign users to org units
- Configure project settings (SOD thresholds, confidence thresholds, excess threshold)
- Manage release waves and scopes
- Monitor the overall dashboard strapline
- Accept provisioning exceptions and resolve SOD conflicts
- Trigger exports when approvals are complete

---

---

## Deck 5: AI & Intelligence Logic

**Audience:** Technical stakeholders, AI/ML audience, architects

---

### Slide 1 — Where AI Is (and Isn't) Used

**Title:** Controlled AI Integration

**AI is used for:**
- Persona generation — clustering users by permission fingerprint
- Role mapping suggestions — coverage/excess calculation
- Reasoning explanations — why a user was assigned to a persona

**AI is NOT used for:**
- Making approval decisions (always human)
- Accepting compliance exceptions (always human)
- Generating SOD rules (uploaded by compliance team)
- Changing any data without human review

**Design principle:** AI accelerates the humans — it doesn't replace them.

---

### Slide 2 — Persona Generation Logic

**Title:** How Personas Are Built

**Input to Claude:**
- User's full source role list → expanded to permission objects (T-codes)
- User's org unit, department, job title
- Project context (system, wave, business function)
- Existing persona definitions (for consistency)

**Claude's task:**
- Reason over permission overlap between users
- Assign the most fitting named persona
- Provide confidence score (0–100)
- Write an explanation of the reasoning

**Guardrails:**
- Confidence below 65% → flagged for mapper review
- Multiple conflicting assignments → human tiebreak
- All AI outputs stored with model version and job run ID for auditability

---

### Slide 3 — Coverage & Excess Calculation

**Title:** Measuring Role Fit

```
Coverage % = (permissions covered by target role ∩ persona permissions)
             ─────────────────────────────────────────────────────────
                        total persona permissions

Excess %   = (target role permissions − persona permissions)
             ──────────────────────────────────────────────
                        target role permissions
```

**Interpretation:**
- High coverage + low excess = good fit (least privilege)
- High coverage + high excess = over-provisioned (needs review)
- Low coverage = under-provisioned (permissions gap)

**Both metrics are stored on `personaTargetRoleMappings`** and surfaced in the mapping UI and Provisioning Alerts.

---

### Slide 4 — The Status Strapline

**Title:** Intelligent Status Narration

Rather than showing raw numbers, the dashboard shows a plain-English status strapline that tells the team what to do next.

**Logic (priority order):**
1. Open critical/high SOD conflicts → "X conflicts are blocking your approval queue — resolve them first"
2. Coverage < 50% → "Persona grouping is the bottleneck — X users need to be assigned"
3. Mapping < 50% → "Mapping is lagging — X personas need target role assignments"
4. Ready for approval > 0 → "X assignments are sitting in the queue — get approvers moving"
5. Approval ≥ 80% → "Final stretch — only X assignments left"
6. Otherwise → current state summary with low-confidence note

**Area strapline** (mapper/approver/coordinator): adds a second sentence about their specific scope.

**No API call required** — pure rule-based logic computed from existing dashboard stats.

---

### Slide 5 — Auditability & Traceability

**Title:** Every Decision is Traceable

| Event | What's logged |
|-------|--------------|
| Persona assignment | userId, personaId, confidenceScore, aiReasoning, aiModel, jobRunId |
| Role mapping | mappedBy (username), timestamp |
| Approval | approvedBy (username), timestamp, status |
| SOD exception | acceptedBy, justification, timestamp |
| Provisioning exception | acceptedBy, justification, excessPercent, timestamp |
| Any data change | `auditLog`: entity, action, old value, new value, actor |

**Purpose:** Full chain of custody from source role → persona → target role → approval → provisioning export. Supports internal audit and external compliance review.

---

---

## Notes for Slide Builder

- **Brand suggestion:** Dark background works well (AIRM uses a dark-accented UI). Emerald for success/approved, red for SOD conflicts, orange for provisioning alerts, blue for information.
- **Diagrams:** The workflow (5 stages) and data model work well as horizontal flow diagrams.
- **Screenshots:** Pull from the live dashboard at `/dashboard`, role mapping at `/mapping`, and SOD analysis at `/sod`.
- **Key metrics to highlight (from demo data):** 100 users → 50 personas → significant mapping effort reduction vs. per-user approach.
