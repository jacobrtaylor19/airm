/**
 * Lumen Phase 3 — RAG Context Provider
 *
 * Builds domain-specific context from project documentation and methodology
 * to give Lumen deeper knowledge about the platform, its workflow, concepts,
 * and best practices. This context is injected into the system prompt alongside
 * live data context from tools.
 *
 * Context chunks are selected based on the user's current page and question
 * to keep the prompt focused and within token limits.
 */

// ---------------------------------------------------------------------------
// Domain knowledge chunks — curated from project docs and methodology
// ---------------------------------------------------------------------------

interface KnowledgeChunk {
  id: string;
  topic: string;
  keywords: string[];
  pages: string[]; // pages where this context is most relevant
  content: string;
}

const KNOWLEDGE_BASE: KnowledgeChunk[] = [
  // ── Workflow & Pipeline ──
  {
    id: "workflow_overview",
    topic: "Migration Workflow",
    keywords: ["workflow", "pipeline", "process", "stage", "step", "how does", "how it works", "overview"],
    pages: ["dashboard", "overview", "methodology"],
    content: `The Provisum migration workflow has 5 stages:
1. **Data Upload** — CSV upload of source users, roles, permissions, target roles, and SOD rules. Templates with valid picklists are available.
2. **AI Persona Generation** — Claude AI analyzes a 100-user sample to design security personas, then programmatic permission-overlap matching assigns all users. This 2-phase approach prevents JSON truncation on large datasets.
3. **Role Mapping** — Mappers assign target roles to each persona. AI auto-mapping is available to suggest initial assignments based on permission coverage analysis. Bulk assign is supported.
4. **SOD Analysis** — Rules engine checks all user-role assignments against the SOD ruleset. Conflicts are classified by severity (critical/high/medium/low). Resolution options: fix mapping, accept risk, or escalate.
5. **Approval** — Approvers review assignments. Statuses flow: draft → pending_review → compliance_approved/sod_rejected → approved. Approved assignments can be exported for provisioning.`,
  },
  {
    id: "persona_concepts",
    topic: "Security Personas",
    keywords: ["persona", "cluster", "group", "ai", "generate", "confidence", "assignment", "coverage"],
    pages: ["personas", "mapping", "calibration", "dashboard"],
    content: `**Security Personas** are groups of users with similar access patterns. They are the bridge between source roles and target roles.

How persona generation works:
- AI analyzes a representative sample of ~100 users to identify access patterns
- It designs personas based on business function, permission clusters, and organizational grouping
- All users are then assigned to personas using programmatic permission-overlap matching
- Each assignment has a **confidence score** (0-100%) indicating match quality
- Low-confidence assignments (<70%) should be reviewed in the Calibration queue

Persona-to-target-role mapping:
- Each persona can map to one or more target roles
- Coverage % shows how much of the persona's source permissions are covered by the target roles
- Excess % shows over-provisioning — permissions in target roles not needed by the persona
- The goal is high coverage with low excess`,
  },
  {
    id: "sod_concepts",
    topic: "Segregation of Duties",
    keywords: ["sod", "segregation", "duties", "conflict", "rule", "compliance", "risk", "separation"],
    pages: ["sod", "approvals", "dashboard", "mapping"],
    content: `**Segregation of Duties (SOD)** ensures no single user has conflicting permissions that could enable fraud.

SOD rules define pairs of roles or permissions that should not be held together. Example: "Create Purchase Order" + "Approve Purchase Order" is a critical SOD conflict.

Severity levels:
- **Critical** — Must be resolved before go-live. Usually financial controls.
- **High** — Should be resolved. May need risk acceptance from compliance.
- **Medium** — Review recommended. Often operational controls.
- **Low** — Informational. Monitor post-go-live.

Resolution options:
- **Fix Mapping** — Change the role assignment to remove the conflict
- **Accept Risk** — Document a business justification and accept the risk (requires approver sign-off)
- **Escalate** — Flag for senior review or compliance committee
- **Request Risk Acceptance** — Ask compliance team to review and approve

SOD analysis runs against all user-target-role assignments and detects where a user would have two conflicting roles.`,
  },
  {
    id: "approval_workflow",
    topic: "Approval Workflow",
    keywords: ["approve", "approval", "review", "submit", "draft", "pending", "status", "workflow", "sign-off"],
    pages: ["approvals", "mapping", "dashboard"],
    content: `Assignment status flow:
- **Draft** — Initial state after auto-mapping or manual assignment. Editable by mappers.
- **Pending Review** — Submitted for SOD analysis. Locked from editing.
- **SOD Rejected** — SOD conflicts found. Needs resolution before re-submission.
- **Compliance Approved** — SOD clean. Ready for business approver review.
- **Ready for Approval** — Auto-promoted high-confidence assignments that passed SOD.
- **Approved** — Final state. Ready for provisioning export.

Key rules:
- Only mappers, admins, and system_admins can submit for review or edit assignments
- Only approvers and admins can approve or reject
- Bulk approve is available for approvers
- Approved assignments cannot be reverted (must be sent back to draft first)`,
  },
  {
    id: "role_hierarchy",
    topic: "User Roles & Permissions",
    keywords: ["role", "permission", "access", "admin", "mapper", "approver", "coordinator", "viewer", "who can"],
    pages: ["admin", "dashboard"],
    content: `Platform roles (highest to lowest access):
- **System Admin** (100) — Full access. Can manage settings, rotate encryption keys, run validation, manage all data.
- **Admin** (80) — Near-full access. Can manage users, settings, run pipeline, approve assignments.
- **Approver** (60) — Reviews and approves/rejects role assignments. Cannot edit mappings. Scoped to assigned org units.
- **Coordinator** (50) — Oversees workflow progress. Can send notifications. Scoped to assigned org units.
- **Mapper** (40) — Creates and edits role mappings. Runs AI pipeline. Scoped to assigned org units.
- **Viewer** (20) — Read-only access to dashboards and data. Cannot modify anything.

Org-unit scoping: Mappers, approvers, and coordinators only see users and data within their assigned organizational unit and its descendants. Admins and system admins see everything.`,
  },
  {
    id: "exports_provisioning",
    topic: "Exports & Provisioning",
    keywords: ["export", "excel", "csv", "pdf", "provisioning", "grc", "sap", "sailpoint", "servicenow", "download"],
    pages: ["exports", "dashboard"],
    content: `Available export formats:
- **Full Excel Report** — Multi-tab workbook with users, personas, mappings, SOD conflicts, and statistics
- **PDF Report** — Executive summary with charts and key metrics
- **Provisioning Export** — Machine-readable format for loading into the target system
- **SOD Exceptions Report** — All accepted risks with justifications for audit trails
- **GRC Exports** — Format-specific exports for SAP GRC, SailPoint IdentityNow, and ServiceNow IRM

Scheduled exports can be configured by admins to run daily, weekly, or monthly.`,
  },
  {
    id: "data_upload",
    topic: "Data Upload",
    keywords: ["upload", "csv", "template", "import", "data", "load", "file", "format"],
    pages: ["upload", "dashboard"],
    content: `Data is uploaded via CSV files. Each upload type has a downloadable template with valid picklist values.

Upload types include:
- **Users** — Source system users with department, location, manager info
- **Source Roles** — Legacy system roles (e.g., SAP ECC roles)
- **Source Permissions** — T-codes, functions, authorizations per role
- **Target Roles** — New system roles (e.g., S/4HANA Fiori roles)
- **Target Permissions** — Permissions in the target system
- **SOD Rules** — Conflict rules defining incompatible role/permission pairs
- **Org Units** — Organizational hierarchy (L1/L2/L3)

Upload flow: Select file → Preview (shows row count, headers, sample data, validation warnings) → Commit. Duplicate rows are skipped. Templates include valid values as a comment row.`,
  },
  {
    id: "risk_analysis",
    topic: "Risk Analysis & Provisioning Alerts",
    keywords: ["risk", "overprovisioning", "least access", "provision", "alert", "excess", "threshold"],
    pages: ["risk-analysis", "least-access", "dashboard"],
    content: `**Provisioning Alerts** flag users who would receive more access than they need in the new system.

The system compares each user's current source permissions against the target roles they'd receive. If a user's target roles include permissions beyond what they currently use, that's over-provisioning.

The threshold (default 30%) determines when an alert fires — if more than 30% of a user's target permissions are excess, they get flagged.

Actions on alerts:
- **Accept** — Acknowledge the over-provisioning with a justification
- **Revoke** — Flag the excess permissions for removal during provisioning

The Risk Analysis dashboard shows aggregate risk metrics, department-level breakdown, and a severity distribution chart.`,
  },
  {
    id: "releases",
    topic: "Releases & Scoping",
    keywords: ["release", "wave", "scope", "go-live", "migration", "phase", "deploy"],
    pages: ["releases", "dashboard"],
    content: `**Releases** represent migration go-live waves. A large migration is typically broken into multiple releases (e.g., Wave 1: Finance, Wave 2: Operations).

Release scoping controls which users, roles, and org units are included in each wave. This lets teams work on one wave at a time while maintaining the full mapping context.

Releases have due dates for key milestones: mapping deadline, review deadline, and approval deadline. Coordinators track these timelines.

Release statuses: planning → in_progress → approved → deployed → stabilizing → completed → archived → cancelled.`,
  },
  {
    id: "lumen_assistant",
    topic: "Lumen AI Assistant",
    keywords: ["lumen", "assistant", "chat", "ai", "help", "bot", "ask"],
    pages: ["all"],
    content: `**Lumen** is Provisum's built-in AI assistant. It can:
- Answer questions about the project status, data, and workflow
- Query live data using tools (dashboard stats, persona details, SOD conflicts, mapping status)
- Trigger actions like auto-mapping and SOD analysis (for authorized roles)
- Explain platform concepts and guide users through the workflow
- Provide context-aware recommendations based on the current project state

All data Lumen returns is scoped to the user's org unit — mappers and approvers only see their assigned scope. Admins see everything.`,
  },
];

// ---------------------------------------------------------------------------
// Context selection — pick relevant chunks based on page + query
// ---------------------------------------------------------------------------

const MAX_CONTEXT_CHUNKS = 4;
const MAX_CONTEXT_CHARS = 4000;

/**
 * Select the most relevant knowledge chunks for a given user query and page.
 */
export function selectContextChunks(
  query: string,
  currentPage: string,
): KnowledgeChunk[] {
  const queryLower = query.toLowerCase();
  const pageLower = currentPage.toLowerCase();

  // Score each chunk by relevance
  const scored = KNOWLEDGE_BASE.map((chunk) => {
    let score = 0;

    // Keyword match in query (strongest signal)
    for (const kw of chunk.keywords) {
      if (queryLower.includes(kw)) {
        score += 10;
      }
    }

    // Page match
    if (chunk.pages.includes("all") || chunk.pages.some((p) => pageLower.includes(p))) {
      score += 3;
    }

    // Topic match in query
    if (queryLower.includes(chunk.topic.toLowerCase())) {
      score += 8;
    }

    return { chunk, score };
  });

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);

  const selected: KnowledgeChunk[] = [];
  let totalChars = 0;

  for (const { chunk, score } of scored) {
    if (score <= 0) break; // No relevance
    if (selected.length >= MAX_CONTEXT_CHUNKS) break;
    if (totalChars + chunk.content.length > MAX_CONTEXT_CHARS) continue;

    selected.push(chunk);
    totalChars += chunk.content.length;
  }

  // Always include workflow overview if nothing matched (fallback)
  if (selected.length === 0) {
    const fallback = KNOWLEDGE_BASE.find((c) => c.id === "workflow_overview");
    if (fallback) selected.push(fallback);
  }

  return selected;
}

/**
 * Build the RAG context string for injection into the system prompt.
 */
export function buildRagContext(query: string, currentPage: string): string {
  const chunks = selectContextChunks(query, currentPage);

  if (chunks.length === 0) return "";

  const sections = chunks.map(
    (c) => `### ${c.topic}\n${c.content}`,
  );

  return `\n## Platform Knowledge\n${sections.join("\n\n")}`;
}
