import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, sql, eq } from "drizzle-orm";

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

export async function getDashboardStats() {
  const [totalUsersRow] = await db.select({ count: count() }).from(schema.users);
  const totalUsers = totalUsersRow!.count;

  const [totalPersonasRow] = await db.select({ count: count() }).from(schema.personas);
  const totalPersonas = totalPersonasRow!.count;

  const [totalSourceRolesRow] = await db.select({ count: count() }).from(schema.sourceRoles);
  const totalSourceRoles = totalSourceRolesRow!.count;

  const [totalTargetRolesRow] = await db.select({ count: count() }).from(schema.targetRoles);
  const totalTargetRoles = totalTargetRolesRow!.count;

  const [totalGroupsRow] = await db.select({ count: count() }).from(schema.consolidatedGroups);
  const totalGroups = totalGroupsRow!.count;

  const [usersWithPersonaRow] = await db
    .select({ count: count() })
    .from(schema.userPersonaAssignments);
  const usersWithPersona = usersWithPersonaRow!.count;

  const [personasWithMappingRow] = await db
    .select({ count: sql<number>`count(distinct ${schema.personaTargetRoleMappings.personaId})` })
    .from(schema.personaTargetRoleMappings);
  const personasWithMapping = Number(personasWithMappingRow!.count);

  const [totalAssignmentsRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments);
  const totalAssignments = totalAssignmentsRow!.count;

  const [approvedAssignmentsRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "approved"));
  const approvedAssignments = approvedAssignmentsRow!.count;

  const [complianceApprovedRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "compliance_approved"));
  const complianceApproved = complianceApprovedRow!.count;

  const [sodRejectedRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "sod_rejected"));
  const sodRejected = sodRejectedRow!.count;

  const [readyForApprovalRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "ready_for_approval"));
  const readyForApproval = readyForApprovalRow!.count;

  const [pendingReviewRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "pending_review"));
  const pendingReview = pendingReviewRow!.count;

  const [draftAssignmentsRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "draft"));
  const draftAssignments = draftAssignmentsRow!.count;

  const [sourcePermissionsRow] = await db.select({ count: count() }).from(schema.sourcePermissions);
  const sourcePermissions = sourcePermissionsRow!.count;

  const [rolePermissionsRow] = await db.select({ count: count() }).from(schema.sourceRolePermissions);
  const rolePermissions = rolePermissionsRow!.count;

  const [sodRulesCountRow] = await db.select({ count: count() }).from(schema.sodRules);
  const sodRulesCount = sodRulesCountRow!.count;

  // SOD conflicts by severity
  const sodConflictsBySeverity = await db
    .select({
      severity: schema.sodConflicts.severity,
      count: count(),
    })
    .from(schema.sodConflicts)
    .groupBy(schema.sodConflicts.severity);

  // Department breakdown
  const departmentStats = await db
    .select({
      department: schema.users.department,
      count: count(),
    })
    .from(schema.users)
    .groupBy(schema.users.department);

  // Users with persona by department
  const deptPersonaCounts = await db
    .select({
      department: schema.users.department,
      count: count(),
    })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.users, eq(schema.userPersonaAssignments.userId, schema.users.id))
    .groupBy(schema.users.department);

  // Low confidence assignments
  const [lowConfidenceRow] = await db
    .select({ count: count() })
    .from(schema.userPersonaAssignments)
    .where(sql`${schema.userPersonaAssignments.confidenceScore} < 65`);
  const lowConfidence = lowConfidenceRow!.count;

  // Existing production access (from previous waves)
  const [existingAccessCountRow] = await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.releasePhase, "existing"));
  const existingAccessCount = existingAccessCountRow!.count;

  const existingAccessUserCount = existingAccessCount > 0
    ? Number((await db
        .select({ count: sql<number>`count(distinct ${schema.userTargetRoleAssignments.userId})` })
        .from(schema.userTargetRoleAssignments)
        .where(eq(schema.userTargetRoleAssignments.releasePhase, "existing"))
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

export async function getDepartmentMappingStatus(): Promise<DepartmentMappingStatus[]> {
  const departments = await db.select({
    department: schema.users.department,
    totalUsers: count(),
  }).from(schema.users).groupBy(schema.users.department);

  return await Promise.all(departments.map(async (d) => {
    const dept = d.department || "Unknown";

    const [withPersonaRow] = await db.select({ count: count() })
      .from(schema.userPersonaAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
      .where(eq(schema.users.department, dept));
    const withPersona = withPersonaRow!.count;

    // Users who have at least one target role assignment
    const [mappedRow] = await db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(eq(schema.users.department, dept));
    const mapped = Number(mappedRow!.count);

    // Users with at least one sod_rejected assignment
    const [sodRejectedRow] = await db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(sql`users.department = ${dept} AND user_target_role_assignments.status = 'sod_rejected'`);
    const sodRejected = Number(sodRejectedRow!.count);

    // Users whose ALL assignments are compliance_approved or sod_risk_accepted or approved
    const [sodCleanRow] = await db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(sql`users.department = ${dept} AND user_target_role_assignments.status IN ('compliance_approved', 'sod_risk_accepted', 'ready_for_approval', 'approved')`);
    const sodClean = Number(sodCleanRow!.count);

    const [approvedRow] = await db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(sql`users.department = ${dept} AND user_target_role_assignments.status = 'approved'`);
    const approved = Number(approvedRow!.count);

    return { department: dept, totalUsers: d.totalUsers, withPersona, mapped, sodRejected, sodClean, approved };
  }));
}

export async function getSourceSystemStats(): Promise<SourceSystemStat[]> {
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
    .groupBy(schema.sourceRoles.system);
}

export async function getDistinctSourceSystems(): Promise<string[]> {
  const rows = await db
    .select({ system: sql<string>`coalesce(${schema.sourceRoles.system}, 'Unknown')` })
    .from(schema.sourceRoles)
    .groupBy(schema.sourceRoles.system);
  return rows.map((r) => r.system);
}
