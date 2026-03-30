import { getDashboardStats } from "@/lib/queries";
import { getPersonas, getPersonaDetail } from "@/lib/queries";
import { getSodConflicts } from "@/lib/queries";
import { getUserScope } from "@/lib/scope";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, eq, sql, inArray, and } from "drizzle-orm";
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
];

// ---------------------------------------------------------------------------
// Allowed roles for action tools
// ---------------------------------------------------------------------------

const ACTION_ROLES = new Set([
  "system_admin",
  "admin",
  "mapper",
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

  switch (toolName) {
    case "get_dashboard_stats":
      return handleGetDashboardStats(scopedUserIds);

    case "get_persona_details":
      return handleGetPersonaDetails(toolInput as { persona_name: string }, scopedUserIds);

    case "get_sod_conflicts":
      return handleGetSodConflicts(toolInput as { user_name?: string }, scopedUserIds);

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

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// ---------------------------------------------------------------------------
// Tool handlers — all respect org-unit scoping
// ---------------------------------------------------------------------------

async function handleGetDashboardStats(scopedUserIds: number[] | null): Promise<string> {
  try {
    // For admins (null scope), use the full dashboard stats
    if (scopedUserIds === null) {
      const stats = await getDashboardStats();
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
  input: { persona_name: string },
  scopedUserIds: number[] | null,
): Promise<string> {
  try {
    const allPersonas = await getPersonas();
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

    const detail = await getPersonaDetail(matches[0].id);
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
  input: { user_name?: string },
  scopedUserIds: number[] | null,
): Promise<string> {
  try {
    const allConflicts = await getSodConflicts();

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
