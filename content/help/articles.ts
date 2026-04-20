/**
 * Static help articles for the in-app knowledge base.
 * Role-aware: each article specifies which roles can see it.
 */

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  category: "getting-started" | "workflow" | "admin" | "roles" | "sod" | "ai" | "troubleshooting";
  roles: string[]; // empty = visible to all roles
  content: string; // rich text (HTML-safe markdown-style)
  relatedSlugs?: string[];
}

const ALL_ROLES: string[] = [];
const ADMIN_ROLES = ["admin", "system_admin"];
const MAPPER_ROLES = ["admin", "system_admin", "mapper"];
const APPROVER_ROLES = ["admin", "system_admin", "approver"];
const COORDINATOR_ROLES = ["admin", "system_admin", "coordinator", "project_manager"];

export const HELP_CATEGORIES: Record<string, { label: string; description: string }> = {
  "getting-started": { label: "Getting Started", description: "Basics of Provisum and the migration workflow" },
  workflow: { label: "Workflow", description: "Step-by-step guides for each stage of the migration" },
  admin: { label: "Administration", description: "System configuration, user management, and settings" },
  roles: { label: "Roles & Access", description: "Understanding roles, permissions, and scoping" },
  sod: { label: "SOD & Compliance", description: "Segregation of duties analysis and conflict resolution" },
  ai: { label: "AI Features", description: "AI-powered persona generation, mapping suggestions, and Lumen" },
  troubleshooting: { label: "Troubleshooting", description: "Common issues and how to resolve them" },
};

export const ARTICLES: HelpArticle[] = [
  {
    slug: "what-is-provisum",
    title: "What is Provisum?",
    summary: "An overview of Provisum and how it streamlines enterprise security role migration.",
    category: "getting-started",
    roles: ALL_ROLES,
    relatedSlugs: ["migration-workflow", "user-management"],
    content: `## What is Provisum?

Provisum is the system of record for enterprise security role migration. It automates the most labor-intensive workstream in any ERP migration: determining who gets what access in the new system.

### The Core Problem

When organizations migrate from one ERP system to another (e.g., SAP ECC to S/4HANA), every user's security access must be redesigned. In a legacy system with 1,000+ users, each with dozens of roles and hundreds of permissions, this is a massive undertaking that traditionally takes months of manual spreadsheet work.

### How Provisum Solves It

Provisum automates this through a 5-stage workflow:

1. **Upload** — Import source system users, roles, and permissions from Excel/CSV
2. **Personas** — AI analyzes access patterns and groups users into security personas
3. **Mapping** — Map each persona to the minimum set of target system roles
4. **SOD Analysis** — Automatically detect segregation of duties conflicts
5. **Approval** — Route mappings through an approval workflow with full audit trail

### The Persona Model

Instead of mapping each user individually, Provisum identifies patterns across your user population and creates "personas" — groups of users who perform similar business functions and need similar access. This reduces thousands of individual mapping decisions to dozens of persona-level decisions.

### Key Benefits

- **80% reduction** in manual mapping effort
- **Full audit trail** for SOX/ITGC compliance
- **AI-powered** persona generation and mapping suggestions
- **Real-time SOD analysis** at both the persona and role level
- **Multi-tenant** support for large-scale migrations with multiple waves`,
  },
  {
    slug: "migration-workflow",
    title: "The 5-Stage Migration Workflow",
    summary: "A step-by-step guide through Upload, Personas, Mapping, SOD, and Approval.",
    category: "workflow",
    roles: ALL_ROLES,
    relatedSlugs: ["uploading-data", "understanding-personas", "mapping-roles"],
    content: `## The 5-Stage Migration Workflow

Provisum organizes the role migration process into five sequential stages. Each stage builds on the previous one.

### Stage 1: Upload

Upload your source system data as Excel or CSV files. You need three datasets:

- **Users** — Employee records with department, job title, and organizational unit
- **Source Roles** — The roles/responsibilities defined in your source system
- **Source Permissions** — The individual permissions (T-codes, functions, menu paths) within each role

Use the template download buttons on the Upload page to get correctly formatted files.

### Stage 2: Persona Generation

Once source data is uploaded, run the AI pipeline to generate security personas. The AI:

1. Analyzes all users' permission patterns
2. Groups users with similar access into personas (typically 15-30 for a 1,000-user population)
3. Assigns each user to their best-matching persona with a confidence score

You can review and manually adjust persona assignments on the Personas page.

### Stage 3: Role Mapping

Map each persona to target system roles. You can:

- Use **AI Suggest** for AI-powered mapping recommendations
- **Manually assign** target roles from the role library
- Use **Auto-Map** for bulk permission-overlap-based mapping

The mapping workspace shows coverage analysis — what percentage of each persona's source permissions are satisfied by the assigned target roles.

### Stage 4: SOD Analysis

Run SOD (Segregation of Duties) analysis to detect conflicts. Provisum checks:

- **Between-role conflicts** — A user holds two roles that conflict with each other
- **Within-role conflicts** — A single role contains conflicting permissions internally

Conflicts are routed to the appropriate workspace (Compliance or Security) for resolution.

### Stage 5: Approval

Approved mappings represent the final, auditable record of who gets what access in the target system. Approvers review assignments by department or org unit, with full visibility into the AI reasoning, confidence scores, and SOD status.`,
  },
  {
    slug: "uploading-data",
    title: "Uploading Source Data",
    summary: "How to prepare and upload users, roles, and permissions from your source system.",
    category: "workflow",
    roles: MAPPER_ROLES,
    relatedSlugs: ["migration-workflow"],
    content: `## Uploading Source Data

The Upload page accepts Excel (.xlsx) and CSV files for three data types: Users, Source Roles, and Source Permissions.

### File Formats

**Users file** must include:
- \`sourceUserId\` — Unique identifier from the source system
- \`displayName\` — Full name
- \`department\` — Organizational department
- \`jobTitle\` — Job title or position

**Source Roles file** must include:
- \`roleId\` — Role identifier (e.g., SAP role name)
- \`roleName\` — Human-readable role name
- \`description\` — What the role provides access to

**Source Permissions file** must include:
- \`permissionId\` — Permission identifier (e.g., T-code, function)
- \`permissionName\` — Human-readable name
- \`sourceRoleId\` — Links back to the source role

### Tips

- Download the template files first — they include the correct headers and sample data
- The upload validates data before importing; errors are shown inline
- Uploading replaces existing data of that type (users, roles, or permissions)
- Large files (10,000+ rows) may take a moment to process`,
  },
  {
    slug: "understanding-personas",
    title: "Understanding Security Personas",
    summary: "What personas are, how they're generated, and how to review assignments.",
    category: "ai",
    roles: ALL_ROLES,
    relatedSlugs: ["migration-workflow", "ai-confidence-scores"],
    content: `## Understanding Security Personas

A security persona represents a group of users who perform similar business functions and need similar system access. Instead of mapping 1,000 users individually, you map 20-30 personas.

### How Personas Are Generated

The AI pipeline analyzes your user population in two phases:

1. **Design phase** — AI examines a sample of users' roles and permissions to identify distinct access patterns, then designs a set of personas that cover the population
2. **Assignment phase** — Each user is programmatically matched to their best-fitting persona based on permission overlap

### Reviewing Persona Assignments

On the Personas page, each persona card shows:

- **Name and description** — What business function this persona represents
- **User count** — How many users are assigned to this persona
- **Confidence scores** — How well each user matches their assigned persona

### Manual Adjustments

You can:
- Reassign users to a different persona
- Create new personas manually
- Edit persona names and descriptions
- Merge personas that are too similar

### Confidence Scores

Each assignment includes a confidence score (0-100):
- **90-100** — Strong match, high overlap between user's permissions and persona definition
- **70-89** — Good match, most permissions align
- **50-69** — Moderate match, review recommended
- **Below 50** — Weak match, manual review required`,
  },
  {
    slug: "mapping-roles",
    title: "Mapping Personas to Target Roles",
    summary: "How to assign target system roles to personas, including AI suggestions.",
    category: "workflow",
    roles: MAPPER_ROLES,
    relatedSlugs: ["understanding-personas", "ai-confidence-scores"],
    content: `## Mapping Personas to Target Roles

The Mapping page is where you assign target system roles to each persona. Every user assigned to that persona will inherit those target roles.

### AI Suggest

Click the sparkles icon on any persona to get AI-powered mapping suggestions. The AI considers:

- **Business function alignment** — Does the target role serve the same business area?
- **Permission overlap** — How many source permissions are covered by the target role?
- **Naming conventions** — Do the role names follow expected patterns for this system?
- **Historical patterns** — What mappings have been accepted or rejected before?

Each suggestion includes a confidence score and reasoning explanation.

### Manual Mapping

You can also manually assign roles:
1. Expand a persona in the mapping workspace
2. Click "Add Target Role"
3. Search and select from the target role library

### Coverage Analysis

After mapping, the coverage percentage shows what fraction of each persona's source permissions are satisfied by the assigned target roles. Aim for 90%+ coverage.

### Bulk Actions

Use multi-select to assign the same target role to multiple personas at once. This is useful for shared roles like display-only or reporting access.`,
  },
  {
    slug: "sod-conflict-resolution",
    title: "SOD Conflict Detection and Resolution",
    summary: "How Provisum detects segregation of duties conflicts and the resolution workflow.",
    category: "sod",
    roles: ALL_ROLES,
    relatedSlugs: ["compliance-workspace", "migration-workflow"],
    content: `## SOD Conflict Detection and Resolution

Segregation of duties (SOD) analysis ensures that no user accumulates conflicting access that could enable fraud or errors.

### Two Types of Conflicts

**Between-role conflicts** occur when a user is assigned two roles that conflict with each other. For example, a user who can both create purchase orders (ME21N) and approve them (ME29N) has a classic procurement SOD conflict.

**Within-role conflicts** occur when a single target role contains conflicting permissions embedded in its definition. This is a structural problem with the role design itself, not with how it's assigned.

### Running SOD Analysis

SOD analysis runs automatically during the pipeline, or you can trigger it manually from the SOD page. It checks every user's complete set of target role permissions against the SOD rulebook.

### The SOD Rulebook

Rules are defined in the SOD Rulebook editor (accessible to compliance officers and admins). Each rule specifies:
- Two conflicting permissions (Permission A and Permission B)
- Severity level (Critical, High, Medium, Low)
- Business justification for why these conflict

### Resolution Paths

**Between-role conflicts** are resolved by:
- Changing the user's role assignment (remove one conflicting role)
- Accepting the risk with documented justification and expiry date

**Within-role conflicts** follow the triage workflow:
1. Compliance officer reviews and decides: Update ruleset, Send for redesign, or Accept risk
2. If sent for redesign, a security architect modifies the target role
3. Affected users are automatically flagged for remapping`,
  },
  {
    slug: "compliance-workspace",
    title: "The Compliance Workspace",
    summary: "How compliance officers triage within-role SOD conflicts.",
    category: "sod",
    roles: ["admin", "system_admin", "compliance_officer"],
    relatedSlugs: ["sod-conflict-resolution"],
    content: `## The Compliance Workspace

The Compliance Workspace at \`/workspace/compliance\` is the primary workbench for compliance officers triaging within-role SOD conflicts.

### Active Queue

The queue shows all within-role conflicts in "open" or "compliance_review" status, sorted by severity. Each card displays:

- The target role name and code
- The conflicting SOD rule (Permission A vs Permission B)
- Severity level
- Number of affected users

### Three Resolution Options

For each conflict, the compliance officer can:

1. **Update Ruleset** — Deactivate the SOD rule if it's no longer relevant. Use this when business requirements have changed or the rule is a false positive.

2. **Send for Redesign** — Route the conflict to the Security Workspace for a security architect to redesign the target role. This is the right choice when the role genuinely contains conflicting permissions that should be separated.

3. **Accept Risk** — Document a business justification and set an expiry date. Use this for known, mitigated risks where the cost of redesign outweighs the risk.

### History Tab

The History tab shows all resolved conflicts with their resolution path, providing an audit trail for compliance reporting.`,
  },
  {
    slug: "ai-confidence-scores",
    title: "Understanding AI Confidence Scores",
    summary: "How confidence scores are calculated and what they mean for your review.",
    category: "ai",
    roles: ALL_ROLES,
    relatedSlugs: ["understanding-personas", "mapping-roles"],
    content: `## Understanding AI Confidence Scores

Confidence scores appear throughout Provisum to help you prioritize review effort. Higher scores mean the AI is more certain about its recommendation.

### Composite Confidence

For AI-assisted mapping suggestions, the confidence score is a weighted composite:

- **AI reasoning (60%)** — Claude's assessment of business function alignment, naming conventions, and domain knowledge
- **Permission overlap (30%)** — Measured intersection of source permissions covered by the target role
- **Historical acceptance (10%)** — Whether similar mappings have been accepted or rejected in the past

### Score Ranges

| Range | Meaning | Action |
|-------|---------|--------|
| 90-100 | High confidence | Auto-approve candidate |
| 70-89 | Good confidence | Quick review recommended |
| 50-69 | Moderate confidence | Detailed review required |
| Below 50 | Low confidence | Manual decision needed |

### Calibration

The Calibration page (\`/calibration\`) lets you set auto-accept thresholds and review assignments by confidence bucket. Use the threshold slider to find the right balance between automation and manual review for your organization's risk tolerance.

### Feedback Loop

When you accept or reject a mapping suggestion, that feedback is stored and influences future confidence scores. Over time, the AI learns your organization's mapping preferences.`,
  },
  {
    slug: "release-management",
    title: "Managing Releases and Migration Waves",
    summary: "How to create releases, set deadlines, and track migration progress.",
    category: "workflow",
    roles: COORDINATOR_ROLES,
    relatedSlugs: ["migration-workflow"],
    content: `## Managing Releases and Migration Waves

Releases represent migration waves — each release tracks a set of user role assignments through the approval workflow.

### Creating a Release

From the Releases page, click "New Release" and configure:

- **Name** — Descriptive name (e.g., "Wave 1 — Finance Go-Live")
- **Source System** — The system you're migrating from (e.g., SAP ECC 6.0)
- **Target System** — The system you're migrating to (e.g., SAP S/4HANA)
- **Phase Deadlines** — Mapping, Review, and Approval deadlines
- **Go-Live Date** — Target go-live for this wave

### Scoping a Release

Each release is scoped to specific org units and/or users. This determines:
- Which users' assignments are included in this release
- Which mappers and approvers see this release's data

### Source System Overrides

For multi-source migrations (e.g., Finance from SAP ECC + HR from Workday), you can set per-org-unit source system overrides. This ensures the AI pipeline uses the correct terminology and permission model for each business unit.

### Readiness Checklist

Each release card shows a readiness checklist tracking 8 criteria: scope defined, assignments created, SOD resolved, all approved, no drafts pending, target date set, mapping deadline met, and approval deadline met.

### Release Comparison

Use the Compare view to see side-by-side metrics between two releases, useful for tracking progress across waves.`,
  },
  {
    slug: "user-management",
    title: "User Management and Invitations",
    summary: "How to invite users, manage roles, and configure access for your team.",
    category: "admin",
    roles: ADMIN_ROLES,
    relatedSlugs: ["user-management"],
    content: `## User Management and Invitations

Provisum supports 9 roles with different access levels. Admins manage users through the admin console.

### Inviting Users

From the Users page, admins can:

- **Single invite** — Enter email, name, and role to send an invitation
- **Bulk CSV upload** — Upload a CSV file with multiple users to invite at once

Invited users receive an email with a link to set their password and activate their account.

### Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| System Admin | 100 | Full system access, all admin features |
| Admin | 80 | User management, settings, pipeline control |
| Project Manager | 70 | Release management, timeline oversight |
| Approver | 60 | Review and approve/reject role assignments |
| Security Architect | 58 | Target role redesign, security workspace |
| Compliance Officer | 55 | SOD triage, compliance workspace |
| Coordinator | 50 | Send reminders, manage deadlines |
| Mapper | 40 | Edit role assignments, run pipeline |
| Viewer | 20 | Read-only access to all data |

### Org Unit Scoping

Non-admin users are scoped to their assigned org unit. A mapper assigned to "Finance" only sees users and assignments within the Finance org unit and its children. Admins see everything.`,
  },
  {
    slug: "admin-onboarding-guide",
    title: "Admin Onboarding Guide",
    summary: "Complete setup guide for administrators: initial configuration, data upload, pipeline stages, role assignment, and approval workflow.",
    category: "admin",
    roles: ADMIN_ROLES,
    relatedSlugs: ["user-management", "migration-workflow", "uploading-data"],
    content: `## Admin Onboarding Guide

This guide walks administrators through the complete Provisum setup process, from initial configuration to go-live.

### Phase 1: Initial Setup

1. **Log in** with your admin credentials at the login page
2. **Navigate to Admin** — Open the Admin module from the home tile launcher
3. **Configure Settings** — In the Config Console, review:
   - Confidence threshold for auto-approval (default: 85%)
   - Provisioning alert threshold (default: 30%)
   - Email notification settings (requires RESEND_API_KEY)
   - Feature flags for optional capabilities

### Phase 2: Invite Your Team

1. Go to **Admin → App Users**
2. Click **Invite User** for each team member
3. Assign appropriate roles:
   - **Mapper** — Will edit role assignments and run the AI pipeline
   - **Approver** — Will review and approve/reject assignments
   - **Coordinator** — Will manage deadlines and send reminders
   - **Project Manager** — Will oversee releases and timelines
   - **Compliance Officer** — Will triage escalated SOD conflicts
   - **Security Architect** — Will review target role designs
   - **Viewer** — Read-only access for stakeholders
4. Set **org unit** scoping if using departmental scoping

### Phase 3: Upload Source Data

Navigate to **Admin → Data Upload** and upload in this order:

| Step | Upload Type | Template | Description |
|------|-----------|----------|-------------|
| 1 | Org Hierarchy | org-hierarchy-template.csv | Department structure |
| 2 | Source Users | source-users-template.csv | User profiles with departments |
| 3 | Source Roles | source-roles-template.csv | Legacy system roles |
| 4 | User-Role Assignments | user-role-assignments-template.csv | Who has what access today |
| 5 | Target Roles | target-roles-template.csv | New system role catalog |
| 6 | SOD Rules | sod-rules-template.csv | Conflict rules matrix |
| 7 | Existing Prod Access | existing-access-template.csv | Current production assignments (optional) |

Download templates from the upload page. Each includes column headers and example rows.

### Phase 4: Create a Release

1. Go to the **Releases** module
2. Click **Create Release** and set:
   - Release name (e.g., "Wave 1 — Finance")
   - Target go-live date
   - Mapping and approval deadlines
   - Source and target system types
3. **Scope the release** to specific org units or user groups

### Phase 5: Run the AI Pipeline

This is where Provisum shines. The pipeline runs in three stages:

**Stage 1 — Persona Generation:**
- Go to **Mapping → Personas** tab
- Click **Generate Personas** (or use Lumen: "Generate personas for this release")
- AI analyzes all source users' permission patterns and creates security personas
- Review and confirm generated personas

**Stage 2 — Auto-Map Roles:**
- Go to **Mapping → Auto-Map** tab
- Click **Auto-Map All Personas**
- AI maps each persona to target roles based on permission overlap, naming conventions, and business function
- Review confidence scores — high-confidence mappings (85%+) can be auto-approved

**Stage 3 — SOD Analysis:**
- Go to **SOD Analysis** module
- Click **Run Analysis**
- System checks all assignments against SOD rules
- Conflicts are flagged with severity levels

### Phase 6: Mapper Refinement

Mappers review their scoped assignments:
1. Open individual users in the **Mapping** module
2. Add, remove, or swap target role assignments
3. Use **AI Suggest** for role recommendations
4. Submit completed users **for review** (Submit for Review button)

### Phase 7: Approval Workflow

1. Approvers see submitted users in the **Approvals** module
2. Review each user's target roles, SOD status, and confidence scores
3. **Approve** clean assignments or **Reject** with notes
4. Rejected users go back to the mapper's draft queue

### Phase 8: Export & Go-Live

1. **Provisioning CSV** — Download from Exports module for loading into the target system
2. **SOD Exception Report** — Document all accepted risks with mitigating controls
3. **Audit Evidence Package** — SOX/ITGC audit-ready Excel with 6 tabs
4. **Security Design Export** — Role catalog, permission matrix, and SOD summary
5. **Full Excel Report** — Complete mapping chain for management review

### Quick-Start Checklists

**For Mappers:**
- [ ] Log in and navigate to the Mapping module
- [ ] Review your assigned org unit scope
- [ ] Open users in Draft status
- [ ] Review AI-suggested roles (sparkle icon)
- [ ] Adjust assignments as needed
- [ ] Submit completed users for review

**For Approvers:**
- [ ] Log in and navigate to the Approvals module
- [ ] Review pending assignments
- [ ] Check SOD conflict status (red badges = unresolved)
- [ ] Approve clean assignments
- [ ] Reject with notes for any issues

**For Coordinators:**
- [ ] Log in and navigate to the Notifications module
- [ ] Monitor mapping and approval progress on Dashboard
- [ ] Send reminders to mappers approaching deadlines
- [ ] Track release readiness in the Releases module`,
  },
  {
    slug: "quick-start-mapper",
    title: "Quick Start: Mapper Guide",
    summary: "Get started as a mapper: review assignments, use AI suggestions, and submit for review.",
    category: "getting-started",
    roles: MAPPER_ROLES,
    relatedSlugs: ["mapping-roles", "admin-onboarding-guide"],
    content: `## Quick Start: Mapper Guide

As a mapper, your job is to review and refine the AI-generated role assignments for users in your scope.

### Your Workflow

1. **Open the Mapping module** from the home tile launcher
2. **Select a user** in Draft status from the user list
3. **Review their current assignments** — these were auto-generated by the AI based on persona analysis
4. **Adjust as needed:**
   - Remove roles that don't apply
   - Add roles using the role selector
   - Click the **AI Suggest** (sparkle) button for intelligent recommendations
5. **Submit for Review** when you're satisfied with the user's role set

### Key Tips

- **Confidence scores** show how certain the AI is about each mapping. Scores below 60% need extra attention.
- **SOD badges** (red) indicate segregation of duties conflicts. Resolve these before submitting.
- **Remap badge** (amber) shows users who were sent back for re-mapping after SOD issues.
- Use **Select All** checkbox to bulk-submit multiple users at once.
- The **Send Back to Draft** button lets you pull back a submitted user if you spot an issue.

### Understanding the Status Flow

\`Draft\` → \`Pending Review\` → \`SOD Analysis\` → \`Compliance Approved\` / \`SOD Rejected\` → \`Approved\`

You can only edit users in **Draft** status. Once submitted, the user is locked until approved or sent back.`,
  },
  {
    slug: "quick-start-approver",
    title: "Quick Start: Approver Guide",
    summary: "Get started as an approver: review submitted assignments and approve or reject.",
    category: "getting-started",
    roles: APPROVER_ROLES,
    relatedSlugs: ["admin-onboarding-guide"],
    content: `## Quick Start: Approver Guide

As an approver, you review role assignments that mappers have submitted and either approve or send them back.

### Your Workflow

1. **Open the Approvals module** from the home tile launcher
2. **Review the queue** — users pending your approval are listed with their status
3. **Click a user** to see their complete role assignment details
4. **Check for:**
   - SOD conflicts (red badges) — these should be resolved before approval
   - Confidence scores — low scores may need mapper justification
   - Role count — unusually high or low role counts warrant investigation
5. **Approve** clean assignments or **Reject** with a reason

### Approval Criteria

- All SOD conflicts should be resolved or have documented mitigating controls
- Role assignments should align with the user's job function and department
- Confidence scores below 50% should have mapper notes explaining the override
- Users with 10+ target roles may need a second review

### After Approval

Approved users are locked and ready for provisioning export. You can view approved users in the Approvals module under the "Approved" filter tab.`,
  },
  {
    slug: "mapping-queue",
    title: "The Mapping Queue",
    summary: "How the queue is structured, what the status columns mean, and how to filter efficiently.",
    category: "workflow",
    roles: MAPPER_ROLES,
    relatedSlugs: ["bulk-mapping", "submitting-for-approval", "overriding-ai-suggestions"],
    content: `## The Mapping Queue

The mapping queue is the mapper's primary workspace. Found at **/mapping**, it shows the users and assignments in your scope that need attention.

### Tabs

The queue has four tabs:

- **Personas** — your list of security personas with mapping status per persona
- **User Role Assignments** — individual user-to-role assignments with status badges
- **Refinements** — low-confidence or flagged assignments that need human review
- **Re-mapping** — assignments with \`remap_required\` status, sent back by approvers or triggered by target role changes

### Status Columns

Each row shows its current workflow status. The common states you'll see:

- **Draft** — editable, not yet submitted for review
- **Pending Review** — locked, awaiting SOD analysis
- **SOD Rejected** — SOD conflicts found, needs resolution before approval
- **Compliance Approved** — SOD clean, ready for approver
- **Ready for Approval** — high-confidence assignments auto-promoted
- **Approved** — final state, ready for provisioning export

### Filters

Each tab has filters for status, release, and (where relevant) department. Your mapping queue is scoped to your assigned org unit and its descendants — you won't see users outside your scope.

### What to Do First

1. Start with **Refinements** — these are the highest-leverage edits
2. Check **Re-mapping** — these are assignments the system explicitly wants you to revisit
3. Clean up any **Draft** rows older than a few days
4. Work through **SOD Rejected** with the compliance officer if needed`,
  },
  {
    slug: "bulk-mapping",
    title: "Bulk Mapping Operations",
    summary: "When to use bulk mapping, how to apply changes across multiple users or personas, and when NOT to.",
    category: "workflow",
    roles: MAPPER_ROLES,
    relatedSlugs: ["mapping-queue", "overriding-ai-suggestions"],
    content: `## Bulk Mapping Operations

Bulk mapping lets you apply the same mapping decision to multiple personas or users at once. Used well, it's a significant time-saver. Used badly, it propagates errors at scale.

### Bulk Persona Mapping

On the **Personas** tab, select multiple personas using the checkboxes, then click **Bulk Assign**. You can assign the same target role to all selected personas in one action. Useful when several personas in the same business function share the same baseline access.

### Bulk Submit for Review

Select multiple rows in **User Role Assignments** and click **Submit Selected** to move them all to \`pending_review\`. The system will run SOD analysis on each in the background.

### Bulk Delete

Admins and mappers can delete multiple assignments via **Bulk Delete**. This is destructive — there is no undo. The action is audit-logged.

### When NOT to Bulk Map

- When personas have different business functions (even if the names look similar)
- When you haven't reviewed the AI confidence scores for each row
- When SOD implications differ across the selection
- When you're in a hurry — bulk mapping under time pressure is how errors creep in

### Safety Net

Every bulk action is audit-logged with your user ID, timestamp, and the list of affected records. If you discover a mistake, the audit log tells you exactly what to revert.`,
  },
  {
    slug: "overriding-ai-suggestions",
    title: "Overriding AI Suggestions",
    summary: "How the override flow works, what happens downstream, and when an override is warranted.",
    category: "workflow",
    roles: MAPPER_ROLES,
    relatedSlugs: ["mapping-queue", "ai-confidence-scores"],
    content: `## Overriding AI Suggestions

The AI mapping engine proposes persona-to-role mappings with a confidence score. You are the final decision maker — overrides are expected and sometimes required.

### How the Override Flow Works

1. The AI suggests a target role with a confidence score and reasoning
2. You open the **AI Suggest** modal on the mapping workspace
3. Review the AI's reasoning, permission overlap percentage, and historical acceptance rate
4. Accept the suggestion, choose a different role, or write in a custom assignment
5. Your decision is recorded in the \`mapping_feedback\` table

### When to Override

- **Low confidence (<60%)** — always review. The AI is flagging uncertainty.
- **Business function mismatch** — if the AI suggests a role that doesn't match the user's department, override it.
- **SOD conflict that can't be mitigated** — if accepting the suggestion would create an unavoidable conflict, pick a different role.
- **New regulatory requirement** — if policy has changed since the AI was last tuned, your override reflects the new policy.

### What Happens Downstream

Your override becomes training data for the next run. The composite confidence formula weights:

- **60%** AI reasoning
- **30%** permission overlap
- **10%** historical acceptance rate

So if you consistently override a specific AI pattern, the system learns to deprioritize that suggestion over time.

### Notes

If you override, leave a short note explaining why. Approvers review overrides more carefully than accepted suggestions — a clear note saves them time and reduces back-and-forth.`,
  },
  {
    slug: "submitting-for-approval",
    title: "Submitting for Approval",
    summary: "What happens when you submit a mapping and what the approver sees on their end.",
    category: "workflow",
    roles: MAPPER_ROLES,
    relatedSlugs: ["mapping-queue", "approving-and-rejecting"],
    content: `## Submitting for Approval

Submitting a mapping moves it from \`draft\` into the approval workflow. This is a one-click action, but it triggers a cascade of automated checks and notifications.

### What Happens When You Submit

1. The assignment status changes from \`draft\` to \`pending_review\`
2. SOD analysis runs automatically in the background
3. If SOD clean → status becomes \`compliance_approved\`, appears in approver's queue
4. If SOD conflicts found → status becomes \`sod_rejected\`, returns to your queue with conflict details
5. The approver receives a notification (email + in-app) when their queue gains new items

### Bulk vs. Individual Submit

- **Individual submit** — use the Submit button on a single row. Best for reviewing each one before submission.
- **Bulk submit** — select multiple rows and click **Submit Selected**. Best when you've reviewed a batch and are confident.

### What the Approver Sees

Approvers see your submission in **/approvals** grouped by user. They see:

- The assignment(s) you submitted
- The persona and target role with AI confidence score
- Any SOD conflicts (with your resolution if you documented one)
- Your mapper notes (if you wrote any)
- The source role(s) that gave this user access historically

### If the Approver Rejects

A rejected assignment returns to your queue as \`remap_required\` with the approver's comments attached. Appears in the **Re-mapping** tab. Fix the issue and resubmit.

### Sending Back Yourself

You can also send a mapping back to draft yourself before an approver gets to it — useful if you realize a mistake after hitting submit. Use the **Send Back to Draft** action on the assignment detail panel.`,
  },
  {
    slug: "approval-queue",
    title: "The Approval Queue",
    summary: "How the approval queue is organized and how to filter efficiently.",
    category: "workflow",
    roles: APPROVER_ROLES,
    relatedSlugs: ["approving-and-rejecting", "reviewing-sod-conflicts"],
    content: `## The Approval Queue

Found at **/approvals**, the queue shows user assignments awaiting your decision. Assignments are grouped by user (not by role) so you can make a holistic decision about each person's access.

### Queue Structure

- **Pending** — users with at least one assignment awaiting approval
- **Approved** — users whose assignments have all been approved (collapsible section at the bottom)
- **Worst status first** — users with the most problematic statuses (SOD Rejected, high risk) appear at the top

### Expanding a User

Click a user row to expand their assignments. You'll see:

- Each assignment (persona → target role) with status badge
- AI confidence score and reasoning
- Any SOD conflicts flagged for this user
- Mapper notes explaining any overrides
- Change impact (permissions gained vs. lost compared to source access)

### Filters

- **Release** — limit to a specific release wave
- **Department** — filter by business unit or org unit
- **Status** — focus on SOD-rejected or high-risk cases first

### Approve All per User

The **Approve All** button on a user row approves every pending assignment for that user at once. Use this when you've reviewed the user's full access and are confident.

### Bulk Approve for Department

On the Department filter view, **Approve All for Department** is available — a batch action for low-risk, high-volume approvals. Use carefully.`,
  },
  {
    slug: "approving-and-rejecting",
    title: "Approving and Rejecting",
    summary: "How to approve or reject a mapping, and what feedback to provide on rejection.",
    category: "workflow",
    roles: APPROVER_ROLES,
    relatedSlugs: ["approval-queue", "reviewing-sod-conflicts"],
    content: `## Approving and Rejecting

Your approval decision is the final gate before provisioning. Approve with confidence when the mapping is sound; reject with clear feedback when it isn't.

### Approving

Click **Approve** on an assignment to set its status to \`approved\`. This locks the assignment — mappers can no longer edit it without going through a re-mapping cycle.

Approved assignments are ready for provisioning export.

### Rejecting

Click **Reject** on an assignment to return it to the mapper with \`remap_required\` status. The assignment appears in the mapper's **Re-mapping** tab.

### What Feedback to Provide

When you reject, always include a comment. Without a comment, the mapper has no idea what you want changed. Good rejection comments:

- **Specific** — "This role grants write access to vendor master data — our policy requires read-only for AP clerks"
- **Actionable** — "Replace with AP_VENDOR_READ instead of AP_VENDOR_EDIT"
- **Contextual** — "See the SOX control AP-03 decision memo attached to this user's audit log"

Bad rejection comments: "No", "Wrong role", "Reconsider"

### When to Approve Despite a Concern

Sometimes a mapping is imperfect but acceptable. Options:

- **Approve with mitigating control documented** — on an SOD conflict, you can accept the risk with a documented control (owner, frequency, description). A green "Controlled" badge appears.
- **Approve with note** — leave a note on the audit log for future auditors explaining your reasoning
- **Approve now, flag for recertification** — approve for go-live, schedule a review in Access Governance for 90 days post-go-live`,
  },
  {
    slug: "reviewing-sod-conflicts",
    title: "Reviewing SOD Conflicts During Approval",
    summary: "How to evaluate an SOD conflict in the context of an approval decision.",
    category: "workflow",
    roles: APPROVER_ROLES,
    relatedSlugs: ["sod-conflict-resolution", "approving-and-rejecting"],
    content: `## Reviewing SOD Conflicts During Approval

An SOD (Segregation of Duties) conflict means a single user would have access that creates fraud risk — for example, the ability to both create a vendor and approve payments to that vendor. Your job as approver is to decide: resolve it, accept it with a mitigating control, or reject the mapping.

### Conflict Severity

- **Critical** — material fraud risk, almost always requires resolution
- **High** — significant risk, requires resolution or strong mitigating control
- **Medium** — moderate risk, acceptable with documented controls
- **Low** — minor risk, often inherent in the role design

### Three Paths Forward

1. **Resolve** — the mapper removes one of the conflicting roles, eliminating the conflict. Best option when the user doesn't actually need both roles.
2. **Accept with Mitigating Control** — document how the organization detects and prevents the fraud scenario. Required fields: control description, control owner, review frequency.
3. **Reject the Mapping** — send back to the mapper with instructions. Use when neither resolve nor accept is appropriate.

### Existing Access

If the conflict is marked **Existing Access** (blue badge), the user already had this combination in the source system. This doesn't make it safe — but it does mean you're not creating new risk, just carrying forward an existing one. Document the decision to carry forward in the audit log.

### What Auditors Look For

When an auditor reviews your decisions, they want to see:

- The conflict was identified before go-live
- A clear decision (resolve / accept / reject)
- If accepted, a documented mitigating control with an owner
- Evidence the control is actually operating post-go-live

This is all captured in the SOX Audit Evidence Package export.`,
  },
  {
    slug: "coordinator-overview",
    title: "Coordinator Responsibilities",
    summary: "What the coordinator role manages and the key dashboards to monitor.",
    category: "workflow",
    roles: COORDINATOR_ROLES,
    relatedSlugs: ["setting-due-dates", "sending-notifications"],
    content: `## Coordinator Responsibilities

Coordinators run the day-to-day operations of a role migration. You're the glue between the mappers, approvers, and the security architect — keeping work moving, surfacing blockers, and hitting deadlines.

### What You Manage

- **Release-level deadlines** — mapping, review, and approval cut-off dates
- **Org unit scope assignments** — which mappers work on which business units
- **Workflow health** — are mappers making progress? Are approvers responsive?
- **Communications** — notifications to mappers and approvers when deadlines approach or blockers appear

### Key Dashboards

- **Dashboard** — the top-level view of project health. Shows coverage percentages, pending work by status, recent activity.
- **Migration Health** (admin) — deeper KPI cards: persona coverage, mapping coverage, SOD resolution, approval rate. Overall health score.
- **Release Readiness Checklist** — per-release 8-point checklist (scope, assignments, SOD, approvals, deadlines). Tells you at a glance if a release is on track.
- **Activity Pulse** (admin) — last 24h / 7d activity counts, broken down by action type. Good for spotting drops in mapper throughput.

### Your Typical Workflow

1. Start the day on the Dashboard, scanning the strapline and coverage numbers
2. Check Release Readiness for any release with upcoming deadlines
3. If a release is behind, use **Send Reminders** to notify the responsible mappers or approvers
4. Update deadlines if you've agreed extensions with the project manager
5. Review any new SOD conflicts surfaced by the compliance officer`,
  },
  {
    slug: "setting-due-dates",
    title: "Setting Release Due Dates",
    summary: "How to set and update release-level mapping, review, and approval deadlines.",
    category: "workflow",
    roles: COORDINATOR_ROLES,
    relatedSlugs: ["coordinator-overview", "releases-and-waves"],
    content: `## Setting Release Due Dates

Each release has three deadline fields that drive the workflow and the reminder system:

- **Mapping Deadline** — by when all user mappings must be submitted
- **Review Deadline** — by when approvers must finish approving submitted mappings
- **Approval Deadline** — the final cut-off before the release is considered closed

### How to Set Them

1. Go to **/releases**
2. Click the release name to open the edit dialog
3. Set Cutover Date and Go-Live Date (anchor dates)
4. Set the three deadline fields
5. Save

### How the Deadlines Are Used

- The **Release Readiness Checklist** uses the deadlines to compute on-track status
- The **Dashboard strapline** mentions deadlines when they're approaching
- The **notification system** sends automatic reminders at 7-day, 3-day, and 1-day marks
- The **status slide export** includes the timeline for project reporting

### Adjusting Deadlines

If you need to extend a deadline, just edit the release — the change is audit-logged and downstream systems pick up the new date automatically. Consider sending a notification to affected mappers and approvers so they know the date moved.

### Common Mistake

Setting the approval deadline before allowing enough time for SOD analysis. Rule of thumb: at least 5 business days between the mapping deadline and the approval deadline to give the approver and compliance officer time to work through conflicts.`,
  },
  {
    slug: "sending-notifications",
    title: "Sending Notifications",
    summary: "How to compose and send notifications to mappers and approvers.",
    category: "workflow",
    roles: COORDINATOR_ROLES,
    relatedSlugs: ["coordinator-overview"],
    content: `## Sending Notifications

Notifications are how you communicate with mappers and approvers in-app and via email. Use them for deadline reminders, blocker escalations, and status updates.

### Compose a Notification

1. Go to **/notifications**
2. Click **Send Notification**
3. Select recipients (one or more users by role or individually)
4. Choose a quick message template or write your own
5. Send

### Delivery

Notifications are delivered two ways simultaneously:

- **In-app** — appears in the recipient's inbox at /notifications, badge count on the sidebar
- **Email** — sent via Resend from \`hello@provisum.io\` (fire-and-forget — if email fails, the in-app notification still arrives)

### Quick Message Templates

Pre-built templates cover common scenarios:

- Deadline reminder (mapping / review / approval)
- SOD conflict escalation
- New assignment ready for your review
- Release milestone update

### Send Reminders (Automated)

From the dashboard or release page, you can trigger a **Send Reminders** action that notifies all users with overdue work. This is bulk — use when a deadline is approaching and multiple users need nudging.

### Good Notification Practice

- Be specific about the action required
- Include a link to the relevant page (the template does this automatically)
- Don't over-notify — one escalation per blocker per day is plenty
- Acknowledge the recipient's effort — "Thanks for wrapping up Wave 1, checking in on Wave 2" goes further than "Wave 2 is late"`,
  },
  {
    slug: "permission-gap-analysis",
    title: "Permission Gap Analysis",
    summary: "What a permission gap is, the gap vs. overlap distinction, and what 'access continuity' means.",
    category: "workflow",
    roles: ALL_ROLES,
    relatedSlugs: ["understanding-personas", "releases-and-waves"],
    content: `## Permission Gap Analysis

When a user moves from the source system to the target system, their access is likely to change. Gap analysis tells you how much.

### Core Terms

- **Overlap** — permissions the user had in the source system that they also have in the target system. This is *access continuity* — they can do the same things as before.
- **Gap** — permissions the user had in the source system that they no longer have in the target system. This is *reduced access*.
- **New Access** — permissions the user did NOT have in the source system that they now have in the target system. This is *expanded access*.

### Why It Matters

Gaps aren't automatically bad. Sometimes a gap is intentional (we're removing excessive access). Sometimes a gap is a problem (the user needs that permission to do their job). The gap view lets you see both cases at once.

### How to Read the View

Go to **/mapping** → **Gap Analysis** tab. For each user:

- **Coverage %** — what percentage of their source permissions are carried forward in the target mapping
- **Access Gaps** — specific permissions that aren't covered (with capability descriptions, not just permission IDs)
- **Continued** — permissions explicitly carried forward

### Confirm vs. Remap

For each user, you have two actions:

- **Confirm** — the gap is intentional. The user doesn't need that permission in the new system. This snapshot is saved for Cursus OCM integration (future).
- **Remap** — the gap is a problem. Navigate to refinements with the user pre-selected and add the missing role or permissions.

### Change Impact Grouping

Confirmed users are grouped by change impact level — High / Medium / Low / None. This aligns with the Organizational Change Management workstream and flags users who will experience the most disruption.`,
  },
  {
    slug: "releases-and-waves",
    title: "Releases and Waves",
    summary: "How releases structure a migration project and how org units are scoped within a release.",
    category: "workflow",
    roles: ALL_ROLES,
    relatedSlugs: ["coordinator-overview", "setting-due-dates"],
    content: `## Releases and Waves

Most enterprise ERP migrations don't happen all at once. They're broken into waves — regional go-lives, business unit rollouts, phased plant cutovers. Provisum models this with **releases**.

### What a Release Is

A release represents one go-live event. It has:

- A name (e.g., "Wave 1 — North America Finance")
- A cutover date and go-live date
- A scope: which users, source roles, target roles, and SOD rules are in scope
- Deadline fields: mapping, review, approval
- A status: Planning → In Progress → Approved → Deployed → Stabilizing → Completed

### Org Unit Scoping

Within a release, you can scope to specific org units. Only users in the scoped org units are part of that release. A user can appear in multiple releases (if they're in multiple org units being migrated at different times).

### Source and Target System Typing

Each release declares its source and target system types (SAP ECC, S/4HANA, Oracle EBS, etc.). This drives the AI pipeline's context — the same set of personas is mapped differently depending on the target system.

### Working Across Releases

- **Release Selector** (top of sidebar) — switch between releases to focus your view
- **Release Comparison** (/releases/compare) — see two releases side-by-side
- **Timeline View** (/releases/timeline) — Gantt-style view of all releases in the program

### Programs

Releases roll up to a **program** (e.g., "SAP S/4HANA Migration — Global"). Every release has a program. In standalone Provisum, programs are flat. In Cursus-embedded mode, programs roll up to portfolios.`,
  },
  {
    slug: "uploading-target-roles",
    title: "Uploading Target Roles",
    summary: "File format requirements, supported columns, and validation rules for target role uploads.",
    category: "admin",
    roles: ADMIN_ROLES,
    relatedSlugs: ["uploading-data", "running-the-ai-pipeline"],
    content: `## Uploading Target Roles

Target roles are the roles in your new (target) system — typically S/4HANA, Oracle Cloud, Workday, or similar. Provisum needs to know about them before mapping can begin.

### Two Upload Paths

1. **CSV Upload** — manual upload via **/data/upload** → Target Roles tab. Best for one-time loads or when you don't have API access to the target system.
2. **Adapter Pull** — automated pull via the target system adapter. Available for SAP S/4HANA (mock) today; real adapters ship when customers need them. See **/admin/security-design**.

### CSV Format

Required columns (case-insensitive):

- \`role_name\` — unique role identifier in the target system
- \`role_description\` — human-readable description
- \`business_function\` — finance, operations, HR, etc. (free text, used by AI)
- \`permissions\` — comma-separated list of permission codes

Optional columns:

- \`department\` — owning department
- \`parent_role\` — for role hierarchy
- \`risk_level\` — high/medium/low classification
- \`sod_sensitive\` — boolean flag

### Validation

On upload, Provisum validates:

- All required columns present
- No duplicate role names
- Permissions reference known permission codes (if target permissions were uploaded first)
- Role names match the target system's naming convention (if system type is set)

Validation errors appear inline with row-level detail. Fix the CSV and re-upload.

### After Upload

New target roles default to status **draft**. A security_architect or admin must approve them (status → **active**) before they appear in the mapper's role selector. This gates who can introduce new roles into the mapping workflow.

### Downloading a Template

The upload page has a **Download Template** button that generates a blank CSV with the correct column headers and a few sample rows.`,
  },
  {
    slug: "running-the-ai-pipeline",
    title: "Running the AI Pipeline",
    summary: "The four AI jobs in order, when to run each, and how to check status.",
    category: "admin",
    roles: ADMIN_ROLES,
    relatedSlugs: ["understanding-personas", "uploading-data"],
    content: `## Running the AI Pipeline

The AI pipeline is a sequence of four jobs that turns raw source data into mapped, SOD-analyzed role assignments.

### The Four Jobs (in order)

1. **Persona Generation** — Claude analyzes source users and their access patterns, proposes security personas
2. **User-Persona Assignment** — programmatic permission-overlap matching assigns each source user to the best-fit persona
3. **Target Role Mapping** — Claude matches each persona to target roles, weighted by business function and permission coverage
4. **SOD Analysis** — evaluates every proposed assignment against the SOD rulebook, flagging conflicts

### Where to Run Them

- **/admin** → pipeline jobs — one-click triggers for each stage
- **Lumen chat** — ask Lumen to trigger a job (e.g., "run SOD analysis for the finance wave")
- **API** — \`POST /api/ai/persona-generation\`, \`POST /api/ai/auto-map\`, etc. (programmatic, used by integration tests)

### Order Matters

The jobs have dependencies. Running them out of order gives bad results:

- Persona Generation must complete before User-Persona Assignment
- Target Role Mapping requires personas to exist AND target roles to be uploaded + active
- SOD Analysis requires assignments to exist

### How to Check Status

- **Processing Jobs** table on /admin — live status (pending, running, succeeded, failed)
- **Job detail page** — per-job logs, error messages, retry button
- **Notifications** — you'll get an in-app notification when a job completes or fails

### When Jobs Fail

The \`job-runner\` wraps each pipeline task with retry (3 attempts, exponential backoff). If all retries fail, the job goes to a dead-letter state and triggers an incident in \`/admin/incidents\` with AI triage.

### Re-Running

It's safe to re-run any pipeline job. The output is idempotent — existing rows are updated, not duplicated. But re-running Persona Generation will overwrite existing persona assignments, so confirm with your mappers before triggering it mid-project.`,
  },
  {
    slug: "exporting-data",
    title: "Exporting Data",
    summary: "What the Excel exports contain and how to use them for downstream provisioning.",
    category: "admin",
    roles: ADMIN_ROLES,
    relatedSlugs: ["submitting-for-approval"],
    content: `## Exporting Data

Provisum produces several exports for downstream consumers: provisioning teams, auditors, program managers, and integrations with other tools.

### Export Types

| Export | Location | Consumer |
|--------|----------|----------|
| **Provisioning Export (Excel)** | /exports | Provisioning team (SAP GRC, SailPoint, manual) |
| **Status Slide (PowerPoint)** | /exports | Program manager |
| **Security Design (Excel, 3-tab)** | /exports | Security architect |
| **SOX/ITGC Audit Evidence Package (Excel, 6-tab)** | /admin/evidence-package | SOX auditor |
| **Scheduled Exports** | /admin/scheduled-exports | Recurring distribution (daily/weekly/monthly) |

### Provisioning Export

The main Excel export contains approved assignments ready to be loaded into the target system's provisioning engine. Columns include:

- User ID, name, email
- Target roles (one row per role, or pivoted)
- Effective date (tied to release go-live)
- Approval audit info (approver, timestamp)

Format adapters are available for SAP GRC, ServiceNow, and SailPoint. The adapter reshapes the Excel into each tool's expected layout.

### SOX Audit Evidence Package

A 6-tab Excel designed to satisfy SOX 404 and SOC 2 CC6 audit requirements:

1. Cover Sheet — project metadata, export timestamp
2. Control Summary — mapped to SOX 404 and SOC 2 CC6 control objectives
3. User Access Matrix — user × role pivot
4. Persona Assignments — user → persona → roles chain
5. SOD Conflicts — all conflicts with resolution status and mitigating controls
6. Approval Audit Trail — every approval/rejection with timestamp and approver

### Scheduled Exports

For recurring distribution — daily, weekly, or monthly. Configured in /admin/scheduled-exports. Runs via Vercel cron and emails the export to configured recipients.

### Access Control

Exports are scoped and audit-logged. Mappers can only export their scope; admins can export everything. Every export creates an audit log entry with the user, timestamp, export type, and row count.`,
  },
];

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesForRole(role: string): HelpArticle[] {
  return ARTICLES.filter((a) => a.roles.length === 0 || a.roles.includes(role));
}

export function getArticlesByCategory(category: string, role?: string): HelpArticle[] {
  return ARTICLES.filter(
    (a) => a.category === category && (a.roles.length === 0 || (role && a.roles.includes(role)))
  );
}

export function searchArticles(query: string, role?: string): HelpArticle[] {
  const q = query.toLowerCase();
  return getArticlesForRole(role ?? "viewer").filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      a.content.toLowerCase().includes(q)
  );
}
