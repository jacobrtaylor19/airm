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
    relatedSlugs: ["migration-workflow", "understanding-roles"],
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
    relatedSlugs: ["understanding-roles"],
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
