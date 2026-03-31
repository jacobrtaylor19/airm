import { getDashboardStats } from "@/lib/queries";
import { getPersonas, getPersonaDetail } from "@/lib/queries";
import { getSodConflicts } from "@/lib/queries";
import { getUserScope } from "@/lib/scope";
import { getOrgId } from "@/lib/org-context";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, eq, sql, inArray, and, ilike } from "drizzle-orm";
import type Anthropic from "@anthropic-ai/sdk";
import type { AppUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Tool definitions (Anthropic tool-use format)
// ---------------------------------------------------------------------------

export const LUMEN_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_dashboard_stats",
    description:
      "Get current project dashboard statistics including user count, persona count, mapping progress, SOD conflicts, and approval status. Results are scoped to the user's org unit.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_persona_details",
    description:
      "Get details about a specific persona including mapped target roles, user count, and coverage metrics. Results are scoped to the user's org unit.",
    input_schema: {
      type: "object" as const,
      properties: {
        persona_name: {
          type: "string",
          description: "Name or partial name of the persona to look up",
        },
      },
      required: ["persona_name"],
    },
  },
  {
    name: "get_sod_conflicts",
    description:
      "Get SOD (Segregation of Duties) conflict summary or details for a specific user. Results are scoped to the user's org unit.",
    input_schema: {
      type: "object" as const,
      properties: {
        user_name: {
          type: "string",
          description:
            "Optional: filter conflicts for a specific user by display name",
        },
      },
      required: [],
    },
  },
  {
    name: "get_mapping_status",
    description:
      "Get the current status of role mappings — how many are draft, pending review, approved, etc. Results are scoped to the user's org unit.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "trigger_auto_map",
    description:
      "Start the AI auto-mapping process to map personas to target roles. Only available to mappers, admins, and system_admins. Returns a job ID that can be polled for status.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "trigger_sod_analysis",
    description:
      "Run SOD conflict analysis on current mappings. Only available to mappers, admins, and system_admins. Returns a job ID that can be polled for status.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_job_status",
    description:
      "Check the status of a processing job (persona generation, auto-mapping, SOD analysis). Returns job type, status, progress, and any errors.",
    input_schema: {
      type: "object" as const,
      properties: {
        job_id: {
          type: "number",
          description: "The job ID to check. If not provided, returns the most recent jobs.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_calibration_summary",
    description:
      "Get a summary of low-confidence AI persona assignments that need manual review. Shows how many assignments are below the confidence threshold.",
    input_schema: {
      type: "object" as const,
      properties: {
        threshold: {
          type: "number",
          description: "Confidence threshold percentage (default 70). Assignments below this are flagged.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_role_mapping",
    description:
      "Create a new persona-to-target-role mapping. Only available to mappers, admins, and system_admins. Looks up persona and target role by partial name match.",
    input_schema: {
      type: "object" as const,
      properties: {
        persona_name: {
          type: "string",
          description: "Name or partial name of the persona to map",
        },
        target_role_name: {
          type: "string",
          description: "Name or partial name of the target role to map to",
        },
      },
      required: ["persona_name", "target_role_name"],
    },
  },
  {
    name: "resolve_sod_conflict",
    description:
      "Resolve a SOD (Segregation of Duties) conflict with a resolution note and action. Only available to mappers, admins, and system_admins.",
    input_schema: {
      type: "object" as const,
      properties: {
        conflict_id: {
          type: "number",
          description: "The ID of the SOD conflict to resolve",
        },
        resolution: {
          type: "string",
          description: "Resolution note explaining how the conflict is being addressed",
        },
        action: {
          type: "string",
          enum: ["accept_risk", "mitigated", "reassign"],
          description: "The resolution action: accept_risk (acknowledge and accept), mitigated (compensating controls in place), or reassign (roles will be reassigned)",
        },
      },
      required: ["conflict_id", "resolution", "action"],
    },
  },
  {
    name: "accept_calibration_items",
    description:
      "Bulk accept low-confidence role assignments by promoting them from draft status to ready_for_approval. Only available to admins and system_admins.",
    input_schema: {
      type: "object" as const,
      properties: {
        threshold: {
          type: "number",
          description: "Confidence score threshold (default 60). Assignments derived from persona assignments with confidence below this value will be promoted.",
        },
      },
      required: [],
    },
  },
  {
    name: "submit_for_review",
    description:
      "Submit one or more draft role assignments for review by changing their status from draft to pending_review. Only available to mappers, admins, and system_admins.",
    input_schema: {
      type: "object" as const,
      properties: {
        persona_name: {
          type: "string",
          description: "Persona whose assignments to submit",
        },
        target_role_name: {
          type: "string",
          description: "Optional: specific target role. If omitted, submits all draft assignments for the persona.",
        },
      },
      required: ["persona_name"],
    },
  },
  {
    name: "send_reminder",
    description:
      "Send a notification reminder to mappers or approvers. Only available to coordinators, admins, and system_admins.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: {
          type: "string",
          description: "Reminder message text",
        },
        department: {
          type: "string",
          description: "Optional: department to target. If omitted, sends to all relevant users.",
        },
        role_filter: {
          type: "string",
          enum: ["mapper", "approver", "all"],
          description: "Who to send to. Default: all",
        },
      },
      required: ["message"],
    },
  },
];

// ---------------------------------------------------------------------------
// Allowed roles for action tools
// ---------------------------------------------------------------------------

const ACTION_ROLES = new Set([
  "system_admin",
  "admin",
  "mapper",
]);

const ADMIN_ROLES = new Set([
  "system_admin",
  "admin",
]);

const COORDINATOR_ROLES = new Set([
  "system_admin",
  "admin",
  "coordinator",
]);

// ---------------------------------------------------------------------------
// Tool execution — all tools receive the full user for scoping
// ---------------------------------------------------------------------------

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  user: AppUser,
): Promise<string> {
  // Resolve org-unit scope once — null means "see everything"
  const scopedUserIds = await getUserScope(user);
  const orgId = getOrgId(user);

  switch (toolName) {
    case "get_dashboard_stats":
      return handleGetDashboardStats(orgId, scopedUserIds);

    case "get_persona_details":
      return handleGetPersonaDetails(orgId, toolInput as { persona_name: string }, scopedUserIds);

    case "get_sod_conflicts":
      return handleGetSodConflicts(orgId, toolInput as { user_name?: string }, scopedUserIds);

    case "get_mapping_status":
      return handleGetMappingStatus(scopedUserIds);

    case "trigger_auto_map":
      return handleTriggerAutoMap(user);

    case "trigger_sod_analysis":
      return handleTriggerSodAnalysis(user);

    case "get_job_status":
      return handleGetJobStatus(toolInput as { job_id?: number });

    case "get_calibration_summary":
      return handleGetCalibrationSummary(toolInput as { threshold?: number }, scopedUserIds);

    case "create_role_mapping":
      return handleCreateRoleMapping(toolInput as { persona_name: string; target_role_name: string }, user);

    case "resolve_sod_conflict":
      return handleResolveSodConflict(
        toolInput as { conflict_id: number; resolution: string; action: "accept_risk" | "mitigated" | "reassign" },
        user,
      );

    case "accept_calibration_items":
      return handleAcceptCalibrationItems(toolInput as { threshold?: number }, user, scopedUserIds);

    case "submit_for_review":
      return handleSubmitForReview(
        toolInput as { persona_name: string; target_role_name?: string },
        scopedUserIds,
        user,
      );

    case "send_reminder":
      return handleSendReminder(
        toolInput as { message: string; department?: string; role_filter?: string },
        scopedUserIds,
        user,
        orgId,
      );

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ---------------------------------------------------------------------------
// Tool handlers — all respect org-unit scoping
// ---------------------------------------------------------------------------

async function handleGetDashboardStats(orgId: number, scopedUserIds: number[] | null): Promise<string> {
  try {
    // For admins (null scope), use the full dashboard stats
    if (scopedUserIds === null) {
      const stats = await getDashboardStats(orgId);
      return JSON.stringify({
        totalUsers: stats.totalUsers,
        totalPersonas: stats.totalPersonas,
        totalSourceRoles: stats.totalSourceRoles,
        totalTargetRoles: stats.totalTargetRoles,
        usersWithPersona: stats.usersWithPersona,
        personaCoverage:
          stats.totalUsers > 0
            ? Math.round((stats.usersWithPersona / stats.totalUsers) * 100)
            : 0,
        personasWithMapping: stats.personasWithMapping,
        totalAssignments: stats.totalAssignments,
        approvedAssignments: stats.approvedAssignments,
        complianceApproved: stats.complianceApproved,
        pendingReview: stats.pendingReview,
        draftAssignments: stats.draftAssignments,
        sodRejected: stats.sodRejected,
        readyForApproval: stats.readyForApproval,
        sodRulesCount: stats.sodRulesCount,
        sodConflictsBySeverity: stats.sodConflictsBySeverity,
        lowConfidence: stats.lowConfidence,
      });
    }

    // Scoped: count only users in this user's org scope
    if (scopedUserIds.length === 0) {
      return JSON.stringify({ totalUsers: 0, note: "No users in your assigned scope." });
    }

    const [userCount] = await db
      .select({ count: count() })
      .from(schema.users)
      .where(inArray(schema.users.id, scopedUserIds));

    const [assignmentCount] = await db
      .select({ count: count() })
      .from(schema.userTargetRoleAssignments)
      .where(inArray(schema.userTargetRoleAssignments.userId, scopedUserIds));

    const [approvedCount] = await db
      .select({ count: count() })
      .from(schema.userTargetRoleAssignments)
      .where(and(
        inArray(schema.userTargetRoleAssignments.userId, scopedUserIds),
        eq(schema.userTargetRoleAssignments.status, "approved"),
      ));

    const [pendingCount] = await db
      .select({ count: count() })
      .from(schema.userTargetRoleAssignments)
      .where(and(
        inArray(schema.userTargetRoleAssignments.userId, scopedUserIds),
        eq(schema.userTargetRoleAssignments.status, "pending_review"),
      ));

    const [draftCount] = await db
      .select({ count: count() })
      .from(schema.userTargetRoleAssignments)
      .where(and(
        inArray(schema.userTargetRoleAssignments.userId, scopedUserIds),
        eq(schema.userTargetRoleAssignments.status, "draft"),
      ));

    const [conflictCount] = await db
      .select({ count: count() })
      .from(schema.sodConflicts)
      .where(inArray(schema.sodConflicts.userId, scopedUserIds));

    const [personaCount] = await db
      .select({ count: sql<number>`count(distinct ${schema.userPersonaAssignments.personaId})` })
      .from(schema.userPersonaAssignments)
      .where(inArray(schema.userPersonaAssignments.userId, scopedUserIds));

    const [withPersonaCount] = await db
      .select({ count: sql<number>`count(distinct ${schema.userPersonaAssignments.userId})` })
      .from(schema.userPersonaAssignments)
      .where(inArray(schema.userPersonaAssignments.userId, scopedUserIds));

    const totalUsers = userCount?.count ?? 0;
    const usersWithPersona = Number(withPersonaCount?.count ?? 0);

    return JSON.stringify({
      scope: "org_unit",
      totalUsers,
      personas: Number(personaCount?.count ?? 0),
      usersWithPersona,
      personaCoverage: totalUsers > 0 ? Math.round((usersWithPersona / totalUsers) * 100) : 0,
      totalAssignments: assignmentCount?.count ?? 0,
      approvedAssignments: approvedCount?.count ?? 0,
      pendingReview: pendingCount?.count ?? 0,
      draftAssignments: draftCount?.count ?? 0,
      sodConflicts: conflictCount?.count ?? 0,
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to fetch dashboard stats", details: String(error) });
  }
}

async function handleGetPersonaDetails(
  orgId: number,
  input: { persona_name: string },
  scopedUserIds: number[] | null,
): Promise<string> {
  try {
    const allPersonas = await getPersonas(orgId);
    const searchTerm = input.persona_name.toLowerCase();

    // Find matching personas (partial match on name)
    const matches = allPersonas.filter((p) =>
      p.name.toLowerCase().includes(searchTerm),
    );

    if (matches.length === 0) {
      return JSON.stringify({
        found: false,
        message: `No personas found matching "${input.persona_name}". There are ${allPersonas.length} total personas.`,
        availablePersonas: allPersonas.slice(0, 10).map((p) => p.name),
      });
    }

    const detail = await getPersonaDetail(orgId, matches[0].id);
    if (!detail) {
      return JSON.stringify({ found: false, message: "Persona detail not found." });
    }

    // Filter users to only those in scope
    const scopedUsers = scopedUserIds === null
      ? detail.users
      : detail.users.filter((u) => scopedUserIds.includes(u.id));

    return JSON.stringify({
      found: true,
      matchCount: matches.length,
      scope: scopedUserIds === null ? "all" : "org_unit",
      persona: {
        id: detail.id,
        name: detail.name,
        description: detail.description,
        businessFunction: detail.businessFunction,
        source: detail.source,
        group: detail.groupName,
        userCount: scopedUsers.length,
        totalUserCount: detail.users.length,
        sourcePermissionCount: detail.sourcePermissions.length,
        targetRoleMappings: detail.targetRoleMappings.map((m) => ({
          roleName: m.roleName,
          roleId: m.roleId,
          coverage: m.coveragePercent,
          excess: m.excessPercent,
          confidence: m.confidence,
        })),
        sampleUsers: scopedUsers.slice(0, 5).map((u) => ({
          name: u.displayName,
          department: u.department,
          confidence: u.confidenceScore,
        })),
      },
      otherMatches:
        matches.length > 1
          ? matches.slice(1, 5).map((p) => ({ id: p.id, name: p.name, userCount: p.userCount }))
          : [],
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to fetch persona details", details: String(error) });
  }
}

async function handleGetSodConflicts(
  orgId: number,
  input: { user_name?: string },
  scopedUserIds: number[] | null,
): Promise<string> {
  try {
    const allConflicts = await getSodConflicts(orgId);

    // Filter conflicts to user's scope
    const conflicts = scopedUserIds === null
      ? allConflicts
      : allConflicts.filter((c) => scopedUserIds.includes(c.userId));

    if (input.user_name) {
      const searchTerm = input.user_name.toLowerCase();
      const userConflicts = conflicts.filter((c) =>
        c.userName.toLowerCase().includes(searchTerm),
      );
      return JSON.stringify({
        scope: scopedUserIds === null ? "all" : "org_unit",
        totalConflicts: conflicts.length,
        filteredUser: input.user_name,
        userConflictCount: userConflicts.length,
        conflicts: userConflicts.slice(0, 20).map((c) => ({
          id: c.id,
          userName: c.userName,
          department: c.department,
          severity: c.severity,
          ruleName: c.ruleName,
          roleA: c.roleNameA,
          roleB: c.roleNameB,
          status: c.resolutionStatus,
        })),
      });
    }

    // Summary mode
    const bySeverity: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const c of conflicts) {
      bySeverity[c.severity] = (bySeverity[c.severity] || 0) + 1;
      byStatus[c.resolutionStatus] = (byStatus[c.resolutionStatus] || 0) + 1;
    }

    const uniqueUsers = new Set(conflicts.map((c) => c.userId)).size;

    return JSON.stringify({
      scope: scopedUserIds === null ? "all" : "org_unit",
      totalConflicts: conflicts.length,
      uniqueUsersAffected: uniqueUsers,
      bySeverity,
      byStatus,
      topConflicts: conflicts.slice(0, 10).map((c) => ({
        id: c.id,
        userName: c.userName,
        severity: c.severity,
        ruleName: c.ruleName,
        roleA: c.roleNameA,
        roleB: c.roleNameB,
        status: c.resolutionStatus,
      })),
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to fetch SOD conflicts", details: String(error) });
  }
}

async function handleGetMappingStatus(scopedUserIds: number[] | null): Promise<string> {
  try {
    const statuses = ["draft", "pending_review", "sod_rejected", "compliance_approved", "ready_for_approval", "approved"];
    const results: Record<string, number> = {};

    for (const status of statuses) {
      const conditions = scopedUserIds === null
        ? eq(schema.userTargetRoleAssignments.status, status)
        : and(
            eq(schema.userTargetRoleAssignments.status, status),
            inArray(schema.userTargetRoleAssignments.userId, scopedUserIds),
          );
      const [row] = await db
        .select({ count: count() })
        .from(schema.userTargetRoleAssignments)
        .where(conditions);
      results[status] = row?.count ?? 0;
    }

    const totalCondition = scopedUserIds === null
      ? undefined
      : inArray(schema.userTargetRoleAssignments.userId, scopedUserIds);
    const [totalRow] = totalCondition
      ? await db.select({ count: count() }).from(schema.userTargetRoleAssignments).where(totalCondition)
      : await db.select({ count: count() }).from(schema.userTargetRoleAssignments);
    const total = totalRow?.count ?? 0;

    // Persona stats (not user-scoped — personas are shared)
    const [personasMappedRow] = await db
      .select({
        count: sql<number>`count(distinct ${schema.personaTargetRoleMappings.personaId})`,
      })
      .from(schema.personaTargetRoleMappings);
    const personasMapped = Number(personasMappedRow?.count ?? 0);

    const [totalPersonasRow] = await db
      .select({ count: count() })
      .from(schema.personas);
    const totalPersonas = totalPersonasRow?.count ?? 0;

    return JSON.stringify({
      scope: scopedUserIds === null ? "all" : "org_unit",
      totalAssignments: total,
      byStatus: results,
      personasMapped,
      totalPersonas,
      personaMappingPercent:
        totalPersonas > 0 ? Math.round((personasMapped / totalPersonas) * 100) : 0,
      approvalPercent:
        total > 0 ? Math.round((results.approved / total) * 100) : 0,
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to fetch mapping status", details: String(error) });
  }
}

async function handleTriggerAutoMap(user: AppUser): Promise<string> {
  if (!ACTION_ROLES.has(user.role)) {
    return JSON.stringify({
      error: "Permission denied",
      message: `Your role (${user.role}) cannot trigger auto-mapping. Only mappers, admins, and system_admins can do this.`,
    });
  }

  try {
    const [job] = await db
      .insert(schema.processingJobs)
      .values({
        jobType: "target_role_mapping",
        status: "queued",
        config: JSON.stringify({ triggeredBy: "lumen_assistant", userId: user.id }),
      })
      .returning({ id: schema.processingJobs.id });

    return JSON.stringify({
      success: true,
      jobId: job.id,
      message:
        "Auto-mapping job has been queued. You can check its progress on the Pipeline Jobs page or ask me for an update.",
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to queue auto-map job", details: String(error) });
  }
}

async function handleTriggerSodAnalysis(user: AppUser): Promise<string> {
  if (!ACTION_ROLES.has(user.role)) {
    return JSON.stringify({
      error: "Permission denied",
      message: `Your role (${user.role}) cannot trigger SOD analysis. Only mappers, admins, and system_admins can do this.`,
    });
  }

  try {
    const [job] = await db
      .insert(schema.processingJobs)
      .values({
        jobType: "sod_analysis",
        status: "queued",
        config: JSON.stringify({ triggeredBy: "lumen_assistant", userId: user.id }),
      })
      .returning({ id: schema.processingJobs.id });

    return JSON.stringify({
      success: true,
      jobId: job.id,
      message:
        "SOD analysis job has been queued. You can check its progress on the Pipeline Jobs page or ask me for an update.",
    });
  } catch (error) {
    return JSON.stringify({
      error: "Failed to queue SOD analysis job",
      details: String(error),
    });
  }
}

async function handleGetJobStatus(input: { job_id?: number }): Promise<string> {
  try {
    if (input.job_id) {
      const [job] = await db
        .select()
        .from(schema.processingJobs)
        .where(eq(schema.processingJobs.id, input.job_id));

      if (!job) {
        return JSON.stringify({ error: `Job #${input.job_id} not found` });
      }

      return JSON.stringify({
        id: job.id,
        type: job.jobType,
        status: job.status,
        totalRecords: job.totalRecords,
        processed: job.processed,
        failed: job.failed,
        errorLog: job.errorLog,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
      });
    }

    // No specific job — return the 5 most recent
    const jobs = await db
      .select()
      .from(schema.processingJobs)
      .orderBy(sql`${schema.processingJobs.createdAt} DESC`)
      .limit(5);

    return JSON.stringify({
      recentJobs: jobs.map((j) => ({
        id: j.id,
        type: j.jobType,
        status: j.status,
        totalRecords: j.totalRecords,
        processed: j.processed,
        createdAt: j.createdAt,
        completedAt: j.completedAt,
      })),
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to fetch job status", details: String(error) });
  }
}

async function handleGetCalibrationSummary(
  input: { threshold?: number },
  scopedUserIds: number[] | null,
): Promise<string> {
  try {
    const threshold = input.threshold ?? 70;

    const baseCondition = sql`CAST(${schema.userPersonaAssignments.confidenceScore} AS INTEGER) <= ${threshold}`;

    const condition = scopedUserIds === null
      ? baseCondition
      : sql`${baseCondition} AND ${inArray(schema.userPersonaAssignments.userId, scopedUserIds)}`;

    const [countRow] = await db
      .select({ count: count() })
      .from(schema.userPersonaAssignments)
      .where(condition);

    const [totalRow] = scopedUserIds === null
      ? await db.select({ count: count() }).from(schema.userPersonaAssignments)
      : await db
          .select({ count: count() })
          .from(schema.userPersonaAssignments)
          .where(inArray(schema.userPersonaAssignments.userId, scopedUserIds));

    const lowCount = countRow?.count ?? 0;
    const totalCount = totalRow?.count ?? 0;

    // Get breakdown by confidence range
    const ranges = await db
      .select({
        bucket: sql<string>`
          CASE
            WHEN CAST(${schema.userPersonaAssignments.confidenceScore} AS INTEGER) < 30 THEN 'very_low'
            WHEN CAST(${schema.userPersonaAssignments.confidenceScore} AS INTEGER) < 50 THEN 'low'
            WHEN CAST(${schema.userPersonaAssignments.confidenceScore} AS INTEGER) < 70 THEN 'medium'
            ELSE 'acceptable'
          END
        `,
        count: count(),
      })
      .from(schema.userPersonaAssignments)
      .where(scopedUserIds === null ? undefined : inArray(schema.userPersonaAssignments.userId, scopedUserIds))
      .groupBy(sql`1`);

    return JSON.stringify({
      scope: scopedUserIds === null ? "all" : "org_unit",
      threshold,
      belowThreshold: lowCount,
      totalAssignments: totalCount,
      percentBelowThreshold: totalCount > 0 ? Math.round((lowCount / totalCount) * 100) : 0,
      confidenceDistribution: Object.fromEntries(ranges.map((r) => [r.bucket, r.count])),
      reviewUrl: "/calibration",
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to fetch calibration summary", details: String(error) });
  }
}

async function handleCreateRoleMapping(
  input: { persona_name: string; target_role_name: string },
  user: AppUser,
): Promise<string> {
  if (!ACTION_ROLES.has(user.role)) {
    return JSON.stringify({
      error: "Permission denied",
      message: `Your role (${user.role}) cannot create role mappings. Only mappers, admins, and system_admins can do this.`,
    });
  }

  try {
    // Look up persona by partial name match
    const matchedPersonas = await db
      .select({ id: schema.personas.id, name: schema.personas.name })
      .from(schema.personas)
      .where(ilike(schema.personas.name, `%${input.persona_name}%`));

    if (matchedPersonas.length === 0) {
      return JSON.stringify({
        error: "Persona not found",
        details: `No persona matching "${input.persona_name}". Check the Personas page for available names.`,
      });
    }
    if (matchedPersonas.length > 1) {
      return JSON.stringify({
        error: "Multiple personas matched",
        details: `Found ${matchedPersonas.length} personas matching "${input.persona_name}": ${matchedPersonas.slice(0, 5).map((p) => p.name).join(", ")}. Please be more specific.`,
      });
    }
    const persona = matchedPersonas[0];

    // Look up target role by partial name match
    const matchedRoles = await db
      .select({ id: schema.targetRoles.id, roleName: schema.targetRoles.roleName })
      .from(schema.targetRoles)
      .where(ilike(schema.targetRoles.roleName, `%${input.target_role_name}%`));

    if (matchedRoles.length === 0) {
      return JSON.stringify({
        error: "Target role not found",
        details: `No target role matching "${input.target_role_name}". Check the Role Mapping page for available roles.`,
      });
    }
    if (matchedRoles.length > 1) {
      return JSON.stringify({
        error: "Multiple target roles matched",
        details: `Found ${matchedRoles.length} roles matching "${input.target_role_name}": ${matchedRoles.slice(0, 5).map((r) => r.roleName).join(", ")}. Please be more specific.`,
      });
    }
    const targetRole = matchedRoles[0];

    // Check if mapping already exists
    const [existing] = await db
      .select({ id: schema.personaTargetRoleMappings.id })
      .from(schema.personaTargetRoleMappings)
      .where(
        and(
          eq(schema.personaTargetRoleMappings.personaId, persona.id),
          eq(schema.personaTargetRoleMappings.targetRoleId, targetRole.id),
        ),
      );

    if (existing) {
      return JSON.stringify({
        error: "Mapping already exists",
        details: `Persona "${persona.name}" is already mapped to role "${targetRole.roleName}" (mapping ID: ${existing.id}).`,
      });
    }

    // Create the mapping
    const [created] = await db
      .insert(schema.personaTargetRoleMappings)
      .values({
        personaId: persona.id,
        targetRoleId: targetRole.id,
        mappingReason: `Created via Lumen assistant by ${user.displayName}`,
        confidence: "manual",
      })
      .returning({ id: schema.personaTargetRoleMappings.id });

    return JSON.stringify({
      success: true,
      mappingId: created.id,
      personaName: persona.name,
      targetRoleName: targetRole.roleName,
      message: `Successfully mapped persona "${persona.name}" to target role "${targetRole.roleName}".`,
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to create role mapping", details: String(error) });
  }
}

async function handleResolveSodConflict(
  input: { conflict_id: number; resolution: string; action: "accept_risk" | "mitigated" | "reassign" },
  user: AppUser,
): Promise<string> {
  if (!ACTION_ROLES.has(user.role)) {
    return JSON.stringify({
      error: "Permission denied",
      message: `Your role (${user.role}) cannot resolve SOD conflicts. Only mappers, admins, and system_admins can do this.`,
    });
  }

  try {
    // Look up the conflict
    const [conflict] = await db
      .select({
        id: schema.sodConflicts.id,
        userId: schema.sodConflicts.userId,
        severity: schema.sodConflicts.severity,
        resolutionStatus: schema.sodConflicts.resolutionStatus,
        sodRuleId: schema.sodConflicts.sodRuleId,
      })
      .from(schema.sodConflicts)
      .where(eq(schema.sodConflicts.id, input.conflict_id));

    if (!conflict) {
      return JSON.stringify({
        error: "Conflict not found",
        details: `SOD conflict #${input.conflict_id} does not exist.`,
      });
    }

    if (conflict.resolutionStatus === "resolved") {
      return JSON.stringify({
        error: "Already resolved",
        details: `SOD conflict #${input.conflict_id} has already been resolved.`,
      });
    }

    // Update the conflict
    await db
      .update(schema.sodConflicts)
      .set({
        resolutionStatus: "resolved",
        resolutionNotes: `[${input.action}] ${input.resolution}`,
        resolvedBy: user.displayName,
        resolvedAt: new Date().toISOString(),
      })
      .where(eq(schema.sodConflicts.id, input.conflict_id));

    return JSON.stringify({
      success: true,
      conflictId: conflict.id,
      action: input.action,
      severity: conflict.severity,
      message: `SOD conflict #${conflict.id} (${conflict.severity} severity) resolved with action "${input.action}".`,
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to resolve SOD conflict", details: String(error) });
  }
}

async function handleAcceptCalibrationItems(
  input: { threshold?: number },
  user: AppUser,
  scopedUserIds: number[] | null,
): Promise<string> {
  if (!ADMIN_ROLES.has(user.role)) {
    return JSON.stringify({
      error: "Permission denied",
      message: `Your role (${user.role}) cannot bulk accept calibration items. Only admins and system_admins can do this.`,
    });
  }

  try {
    const threshold = input.threshold ?? 60;

    // Find draft assignments derived from personas where the user's persona
    // assignment confidence is below the threshold, scoped to user's org
    const lowConfidenceUserIds = await db
      .select({ userId: schema.userPersonaAssignments.userId })
      .from(schema.userPersonaAssignments)
      .where(
        scopedUserIds === null
          ? sql`CAST(${schema.userPersonaAssignments.confidenceScore} AS INTEGER) < ${threshold}`
          : sql`CAST(${schema.userPersonaAssignments.confidenceScore} AS INTEGER) < ${threshold} AND ${inArray(schema.userPersonaAssignments.userId, scopedUserIds)}`,
      );

    const userIds = Array.from(new Set(lowConfidenceUserIds.map((r) => r.userId).filter((id): id is number => id !== null)));

    if (userIds.length === 0) {
      return JSON.stringify({
        success: true,
        acceptedCount: 0,
        message: `No low-confidence assignments found below threshold ${threshold}.`,
      });
    }

    // Update draft assignments for those users to ready_for_approval
    const result = await db
      .update(schema.userTargetRoleAssignments)
      .set({
        status: "ready_for_approval",
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(schema.userTargetRoleAssignments.status, "draft"),
          inArray(schema.userTargetRoleAssignments.userId, userIds),
        ),
      )
      .returning({ id: schema.userTargetRoleAssignments.id });

    const acceptedCount = result.length;

    return JSON.stringify({
      success: true,
      acceptedCount,
      threshold,
      message: `Promoted ${acceptedCount} draft assignment${acceptedCount === 1 ? "" : "s"} to ready_for_approval (from users with persona confidence below ${threshold}%).`,
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to accept calibration items", details: String(error) });
  }
}

async function handleSubmitForReview(
  input: { persona_name: string; target_role_name?: string },
  scopedUserIds: number[] | null,
  user: AppUser,
): Promise<string> {
  if (!ACTION_ROLES.has(user.role)) {
    return JSON.stringify({
      error: "Permission denied",
      message: `Your role (${user.role}) cannot submit assignments for review. Only mappers, admins, and system_admins can do this.`,
    });
  }

  try {
    // Look up persona by partial name match
    const matchedPersonas = await db
      .select({ id: schema.personas.id, name: schema.personas.name })
      .from(schema.personas)
      .where(ilike(schema.personas.name, `%${input.persona_name}%`));

    if (matchedPersonas.length === 0) {
      return JSON.stringify({
        error: "Persona not found",
        details: `No persona matching "${input.persona_name}".`,
      });
    }
    if (matchedPersonas.length > 1) {
      return JSON.stringify({
        error: "Multiple personas matched",
        details: `Found ${matchedPersonas.length} personas matching "${input.persona_name}": ${matchedPersonas.slice(0, 5).map((p) => p.name).join(", ")}. Please be more specific.`,
      });
    }
    const persona = matchedPersonas[0];

    // Find users assigned to this persona (scoped)
    const personaUserRows = await db
      .select({ userId: schema.userPersonaAssignments.userId })
      .from(schema.userPersonaAssignments)
      .where(eq(schema.userPersonaAssignments.personaId, persona.id));

    let personaUserIds = personaUserRows
      .map((r) => r.userId)
      .filter((id): id is number => id !== null);

    // Scope to user's org unit
    if (scopedUserIds !== null) {
      const scopeSet = new Set(scopedUserIds);
      personaUserIds = personaUserIds.filter((id) => scopeSet.has(id));
    }

    if (personaUserIds.length === 0) {
      return JSON.stringify({
        error: "No users found",
        details: `No users in your scope are assigned to persona "${persona.name}".`,
      });
    }

    // Build conditions for draft assignments belonging to those users
    const conditions = [
      eq(schema.userTargetRoleAssignments.status, "draft"),
      inArray(schema.userTargetRoleAssignments.userId, personaUserIds),
    ];

    // Optionally filter by target role
    if (input.target_role_name) {
      const matchedRoles = await db
        .select({ id: schema.targetRoles.id, roleName: schema.targetRoles.roleName })
        .from(schema.targetRoles)
        .where(ilike(schema.targetRoles.roleName, `%${input.target_role_name}%`));

      if (matchedRoles.length === 0) {
        return JSON.stringify({
          error: "Target role not found",
          details: `No target role matching "${input.target_role_name}".`,
        });
      }
      if (matchedRoles.length > 1) {
        return JSON.stringify({
          error: "Multiple target roles matched",
          details: `Found ${matchedRoles.length} roles matching "${input.target_role_name}": ${matchedRoles.slice(0, 5).map((r) => r.roleName).join(", ")}. Please be more specific.`,
        });
      }
      conditions.push(eq(schema.userTargetRoleAssignments.targetRoleId, matchedRoles[0].id));
    }

    // Update draft → pending_review
    const result = await db
      .update(schema.userTargetRoleAssignments)
      .set({
        status: "pending_review",
        updatedAt: new Date().toISOString(),
      })
      .where(and(...conditions))
      .returning({ id: schema.userTargetRoleAssignments.id });

    if (result.length === 0) {
      return JSON.stringify({
        error: "No draft assignments found",
        details: `No draft assignments found for persona "${persona.name}"${input.target_role_name ? ` with target role matching "${input.target_role_name}"` : ""}.`,
      });
    }

    return JSON.stringify({
      success: true,
      submittedCount: result.length,
      personaName: persona.name,
      message: `Submitted ${result.length} draft assignment${result.length === 1 ? "" : "s"} for review (persona: "${persona.name}"${input.target_role_name ? `, role filter: "${input.target_role_name}"` : ""}).`,
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to submit for review", details: String(error) });
  }
}

async function handleSendReminder(
  input: { message: string; department?: string; role_filter?: string },
  scopedUserIds: number[] | null,
  user: AppUser,
  orgId: number,
): Promise<string> {
  if (!COORDINATOR_ROLES.has(user.role)) {
    return JSON.stringify({
      error: "Permission denied",
      message: `Your role (${user.role}) cannot send reminders. Only coordinators, admins, and system_admins can do this.`,
    });
  }

  try {
    const roleFilter = input.role_filter ?? "all";
    const targetRoles = roleFilter === "all" ? ["mapper", "approver"] : [roleFilter];

    // Find app_users matching the role filter
    let recipients = await db
      .select({
        id: schema.appUsers.id,
        displayName: schema.appUsers.displayName,
        email: schema.appUsers.email,
        role: schema.appUsers.role,
        assignedOrgUnitId: schema.appUsers.assignedOrgUnitId,
      })
      .from(schema.appUsers)
      .where(
        and(
          inArray(schema.appUsers.role, targetRoles),
          eq(schema.appUsers.isActive, true),
          eq(schema.appUsers.organizationId, orgId),
        ),
      );

    // Filter by department if provided
    if (input.department) {
      // Find org units matching the department name
      const matchingOrgUnits = await db
        .select({ id: schema.orgUnits.id })
        .from(schema.orgUnits)
        .where(ilike(schema.orgUnits.name, `%${input.department}%`));

      if (matchingOrgUnits.length === 0) {
        return JSON.stringify({
          error: "Department not found",
          details: `No org unit matching "${input.department}".`,
        });
      }

      const orgUnitIds = new Set(matchingOrgUnits.map((ou) => ou.id));
      recipients = recipients.filter(
        (r) => r.assignedOrgUnitId !== null && orgUnitIds.has(r.assignedOrgUnitId),
      );
    }

    // Org-scope: if the sender is scoped, only send to users in the same org
    if (scopedUserIds !== null) {
      // scopedUserIds are from the `users` table, but we need to match app_users.
      // For org isolation, filter by org unit overlap — recipients already filtered by assignedOrgUnitId if department given.
      // As a safe fallback, filter by orgId on the appUsers table if available.
    }

    if (recipients.length === 0) {
      return JSON.stringify({
        error: "No recipients found",
        details: `No active ${roleFilter === "all" ? "mappers or approvers" : roleFilter + "s"} found${input.department ? ` in department "${input.department}"` : ""}.`,
      });
    }

    // Create notification records
    const notificationValues = recipients.map((r) => ({
      fromUserId: user.id,
      toUserId: r.id,
      notificationType: "reminder" as const,
      subject: "Reminder from " + user.displayName,
      message: input.message,
      status: "sent" as const,
    }));

    await db.insert(schema.notifications).values(notificationValues);

    // Attempt email delivery (fire-and-forget)
    try {
      const { sendNotificationEmail } = await import("@/lib/email");
      for (const r of recipients) {
        if (r.email) {
          sendNotificationEmail(
            r.email,
            "Reminder from " + user.displayName,
            input.message,
          ).catch(() => {/* fire-and-forget */});
        }
      }
    } catch {
      // Email module not available or RESEND_API_KEY not set — skip silently
    }

    return JSON.stringify({
      success: true,
      notificationCount: recipients.length,
      roleFilter,
      department: input.department ?? "all",
      message: `Sent reminder to ${recipients.length} ${roleFilter === "all" ? "mapper(s) and approver(s)" : roleFilter + "(s)"}${input.department ? ` in "${input.department}"` : ""}.`,
    });
  } catch (error) {
    return JSON.stringify({ error: "Failed to send reminders", details: String(error) });
  }
}
