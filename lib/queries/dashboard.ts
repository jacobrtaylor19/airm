import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, sql, eq, and, inArray } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

/** Build a WHERE condition that combines org scope with optional release user filtering */
function userOrgAndRelease(orgId: number, releaseUserIds: number[] | null) {
  if (releaseUserIds === null) {
    return orgScope(schema.users.organizationId, orgId);
  }
  return and(orgScope(schema.users.organizationId, orgId), inArray(schema.users.id, releaseUserIds));
}

export interface DepartmentMappingStatus {
  department: string;
  totalUsers: number;
  withPersona: number;
  mapped: number;
  sodRejected: number;
  sodClean: number;
  approved: number;
}

export interface SourceSystemStat {
  system: string;
  roleCount: number;
  userCount: number;
}

export async function getDashboardStats(orgId: number, releaseUserIds: number[] | null = null) {
  const userFilter = releaseUserIds !== null
    ? and(orgScope(schema.users.organizationId, orgId), inArray(schema.users.id, releaseUserIds))
    : orgScope(schema.users.organizationId, orgId);

  const [totalUsersRow] = await db.select({ count: count() }).from(schema.users).where(userFilter);
  const totalUsers = totalUsersRow!.count;

  const [totalPersonasRow] = await db.select({ count: count() }).from(schema.personas).where(orgScope(schema.personas.organizationId, orgId));
  const totalPersonas = totalPersonasRow!.count;

  const [totalSourceRolesRow] = await db.select({ count: count() }).from(schema.sourceRoles).where(orgScope(schema.sourceRoles.organizationId, orgId));
  const totalSourceRoles = totalSourceRolesRow!.count;

  const [totalTargetRolesRow] = await db.select({ count: count() }).from(schema.targetRoles).where(orgScope(schema.targetRoles.organizationId, orgId));
  const totalTargetRoles = totalTargetRolesRow!.count;

  const [totalGroupsRow] = await db.select({ count: count() }).from(schema.consolidatedGroups).where(orgScope(schema.consolidatedGroups.organizationId, orgId));
  const totalGroups = totalGroupsRow!.count;

  // Junction table counts — join to org-scoped parent (users) to enforce tenant isolation
  const [usersWithPersonaRow] = await db
    .select({ count: count() })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
    .where(orgScope(schema.users.organizationId, orgId));
  const usersWithPersona = usersWithPersonaRow!.count;

  const [personasWithMappingRow] = await db
    .select({ count: sql<number>`count(distinct ${schema.personaTargetRoleMappings.personaId})` })
    .from(schema.personaTargetRoleMappings)
    .innerJoin(schema.personas, eq(schema.personas.id, schema.personaTargetRoleMappings.personaId))
    .where(orgScope(schema.personas.organizationId, orgId));
  const personasWithMapping = Number(personasWithMappingRow!.count);

  const [totalAssignmentsRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .where(orgScope(schema.users.organizationId, orgId));
  const totalAssignments = totalAssignmentsRow!.count;

  const [approvedAssignmentsRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .where(and(eq(schema.userTargetRoleAssignments.status, "approved"), orgScope(schema.users.organizationId, orgId)));
  const approvedAssignments = approvedAssignmentsRow!.count;

  const [complianceApprovedRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .where(and(eq(schema.userTargetRoleAssignments.status, "compliance_approved"), orgScope(schema.users.organizationId, orgId)));
  const complianceApproved = complianceApprovedRow!.count;

  const [sodRejectedRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .where(and(eq(schema.userTargetRoleAssignments.status, "sod_rejected"), orgScope(schema.users.organizationId, orgId)));
  const sodRejected = sodRejectedRow!.count;

  const [readyForApprovalRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .where(and(eq(schema.userTargetRoleAssignments.status, "ready_for_approval"), orgScope(schema.users.organizationId, orgId)));
  const readyForApproval = readyForApprovalRow!.count;

  const [pendingReviewRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .where(and(eq(schema.userTargetRoleAssignments.status, "pending_review"), orgScope(schema.users.organizationId, orgId)));
  const pendingReview = pendingReviewRow!.count;

  const [draftAssignmentsRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .where(and(eq(schema.userTargetRoleAssignments.status, "draft"), orgScope(schema.users.organizationId, orgId)));
  const draftAssignments = draftAssignmentsRow!.count;

  // sourcePermissions and sourceRolePermissions don't have org_id directly,
  // but sourcePermissions are global reference data — no org scoping needed
  const [sourcePermissionsRow] = await db.select({ count: count() }).from(schema.sourcePermissions);
  const sourcePermissions = sourcePermissionsRow!.count;

  const [rolePermissionsRow] = await db.select({ count: count() }).from(schema.sourceRolePermissions);
  const rolePermissions = rolePermissionsRow!.count;

  const [sodRulesCountRow] = await db.select({ count: count() }).from(schema.sodRules).where(orgScope(schema.sodRules.organizationId, orgId));
  const sodRulesCount = sodRulesCountRow!.count;

  // SOD conflicts by severity — join to users for org scope
  const sodConflictsBySeverity = await db
    .select({
      severity: schema.sodConflicts.severity,
      count: count(),
    })
    .from(schema.sodConflicts)
    .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
    .where(orgScope(schema.users.organizationId, orgId))
    .groupBy(schema.sodConflicts.severity);

  // Department breakdown
  const departmentStats = await db
    .select({
      department: schema.users.department,
      count: count(),
    })
    .from(schema.users)
    .where(orgScope(schema.users.organizationId, orgId))
    .groupBy(schema.users.department);

  // Users with persona by department
  const deptPersonaCounts = await db
    .select({
      department: schema.users.department,
      count: count(),
    })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.users, eq(schema.userPersonaAssignments.userId, schema.users.id))
    .where(orgScope(schema.users.organizationId, orgId))
    .groupBy(schema.users.department);

  // Low confidence assignments
  const [lowConfidenceRow] = await db
    .select({ count: count() })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
    .where(and(sql`${schema.userPersonaAssignments.confidenceScore} < 65`, orgScope(schema.users.organizationId, orgId)));
  const lowConfidence = lowConfidenceRow!.count;

  // Existing production access (from previous waves)
  const [existingAccessCountRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .where(and(eq(schema.userTargetRoleAssignments.releasePhase, "existing"), orgScope(schema.users.organizationId, orgId)));
  const existingAccessCount = existingAccessCountRow!.count;

  const existingAccessUserCount = existingAccessCount > 0
    ? Number((await db
        .select({ count: sql<number>`count(distinct ${schema.userTargetRoleAssignments.userId})` })
        .from(schema.userTargetRoleAssignments)
        .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
        .where(and(eq(schema.userTargetRoleAssignments.releasePhase, "existing"), orgScope(schema.users.organizationId, orgId)))
      )[0]!.count)
    : 0;

  return {
    totalUsers,
    totalPersonas,
    totalSourceRoles,
    totalTargetRoles,
    totalGroups,
    usersWithPersona,
    personasWithMapping,
    totalAssignments,
    approvedAssignments,
    complianceApproved,
    sodRejected,
    readyForApproval,
    pendingReview,
    draftAssignments,
    sourcePermissions,
    rolePermissions,
    sodRulesCount,
    sodConflictsBySeverity,
    departmentStats,
    deptPersonaCounts,
    lowConfidence,
    existingAccessCount,
    existingAccessUserCount,
  };
}

export async function getDepartmentMappingStatus(orgId: number, releaseUserIds: number[] | null = null): Promise<DepartmentMappingStatus[]> {
  const deptUserFilter = userOrgAndRelease(orgId, releaseUserIds);

  const departments = await db.select({
    department: schema.users.department,
    totalUsers: count(),
  }).from(schema.users).where(deptUserFilter).groupBy(schema.users.department);

  return await Promise.all(departments.map(async (d) => {
    const dept = d.department || "Unknown";

    const [withPersonaRow] = await db.select({ count: count() })
      .from(schema.userPersonaAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
      .where(and(eq(schema.users.department, dept), deptUserFilter));
    const withPersona = withPersonaRow!.count;

    // Users who have at least one target role assignment
    const [mappedRow] = await db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(and(eq(schema.users.department, dept), deptUserFilter));
    const mapped = Number(mappedRow!.count);

    // Users with at least one sod_rejected assignment
    const [sodRejectedRow] = await db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(sql`users.department = ${dept} AND user_target_role_assignments.status = 'sod_rejected' AND (${schema.users.organizationId} = ${orgId} OR ${schema.users.organizationId} IS NULL)`);
    const sodRejected = Number(sodRejectedRow!.count);

    // Users whose ALL assignments are compliance_approved or sod_risk_accepted or approved
    const [sodCleanRow] = await db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(sql`users.department = ${dept} AND user_target_role_assignments.status IN ('compliance_approved', 'sod_risk_accepted', 'ready_for_approval', 'approved') AND (${schema.users.organizationId} = ${orgId} OR ${schema.users.organizationId} IS NULL)`);
    const sodClean = Number(sodCleanRow!.count);

    const [approvedRow] = await db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(sql`users.department = ${dept} AND user_target_role_assignments.status = 'approved' AND (${schema.users.organizationId} = ${orgId} OR ${schema.users.organizationId} IS NULL)`);
    const approved = Number(approvedRow!.count);

    return { department: dept, totalUsers: d.totalUsers, withPersona, mapped, sodRejected, sodClean, approved };
  }));
}

export async function getSourceSystemStats(orgId: number): Promise<SourceSystemStat[]> {
  return await db
    .select({
      system: sql<string>`coalesce(${schema.sourceRoles.system}, 'Unknown')`,
      roleCount: count(),
      userCount: sql<number>`(
        SELECT count(DISTINCT usra.user_id)
        FROM user_source_role_assignments usra
        INNER JOIN source_roles sr2 ON sr2.id = usra.source_role_id
        WHERE coalesce(sr2.system, 'Unknown') = coalesce(${schema.sourceRoles.system}, 'Unknown')
      )`,
    })
    .from(schema.sourceRoles)
    .where(orgScope(schema.sourceRoles.organizationId, orgId))
    .groupBy(schema.sourceRoles.system);
}

export async function getDistinctSourceSystems(orgId: number): Promise<string[]> {
  const rows = await db
    .select({ system: sql<string>`coalesce(${schema.sourceRoles.system}, 'Unknown')` })
    .from(schema.sourceRoles)
    .where(orgScope(schema.sourceRoles.organizationId, orgId))
    .groupBy(schema.sourceRoles.system);
  return rows.map((r) => r.system);
}
