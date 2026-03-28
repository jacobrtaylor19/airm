import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, sql, eq, desc, ne, and, inArray } from "drizzle-orm";

// ─────────────────────────────────────────────
// RELEASE SCOPING HELPERS
// ─────────────────────────────────────────────

/**
 * Get user IDs that belong to the given releases.
 * Returns null if releaseIds is null (no filter — show all).
 */
export async function getUserIdsInReleases(releaseIds: number[] | null): Promise<number[] | null> {
  if (releaseIds === null || releaseIds.length === 0) return null;
  const rows = await db
    .select({ userId: schema.releaseUsers.userId })
    .from(schema.releaseUsers)
    .where(inArray(schema.releaseUsers.releaseId, releaseIds));
  return Array.from(new Set(rows.map((r) => r.userId)));
}

/**
 * Get source role IDs that belong to the given releases.
 */
export async function getSourceRoleIdsInReleases(releaseIds: number[] | null): Promise<number[] | null> {
  if (releaseIds === null || releaseIds.length === 0) return null;
  const rows = await db
    .select({ sourceRoleId: schema.releaseSourceRoles.sourceRoleId })
    .from(schema.releaseSourceRoles)
    .where(inArray(schema.releaseSourceRoles.releaseId, releaseIds));
  return rows.length > 0 ? Array.from(new Set(rows.map((r) => r.sourceRoleId))) : null;
}

/**
 * Get target role IDs that belong to the given releases.
 */
export async function getTargetRoleIdsInReleases(releaseIds: number[] | null): Promise<number[] | null> {
  if (releaseIds === null || releaseIds.length === 0) return null;
  const rows = await db
    .select({ targetRoleId: schema.releaseTargetRoles.targetRoleId })
    .from(schema.releaseTargetRoles)
    .where(inArray(schema.releaseTargetRoles.releaseId, releaseIds));
  return rows.length > 0 ? Array.from(new Set(rows.map((r) => r.targetRoleId))) : null;
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

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────

export interface UserRow {
  id: number;
  sourceUserId: string;
  displayName: string;
  email: string | null;
  department: string | null;
  jobTitle: string | null;
  personaName: string | null;
  personaId: number | null;
  confidenceScore: number | null;
  assignmentStatus: string | null;
  groupName: string | null;
}

export async function getUsers(): Promise<UserRow[]> {
  return await db
    .select({
      id: schema.users.id,
      sourceUserId: schema.users.sourceUserId,
      displayName: schema.users.displayName,
      email: schema.users.email,
      department: schema.users.department,
      jobTitle: schema.users.jobTitle,
      personaName: schema.personas.name,
      personaId: schema.userPersonaAssignments.personaId,
      confidenceScore: schema.userPersonaAssignments.confidenceScore,
      assignmentStatus: sql<string | null>`(
        SELECT utra.status
        FROM user_target_role_assignments utra
        WHERE utra.user_id = users.id
        LIMIT 1
      )`,
      groupName: schema.consolidatedGroups.name,
    })
    .from(schema.users)
    .leftJoin(
      schema.userPersonaAssignments,
      eq(schema.userPersonaAssignments.userId, schema.users.id)
    )
    .leftJoin(
      schema.personas,
      eq(schema.personas.id, schema.userPersonaAssignments.personaId)
    )
    .leftJoin(
      schema.consolidatedGroups,
      eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId)
    );
}

export interface UserDetail {
  id: number;
  sourceUserId: string;
  displayName: string;
  email: string | null;
  department: string | null;
  jobTitle: string | null;
  orgUnit: string | null;
  orgUnitId: number | null;
  costCenter: string | null;
  userType: string | null;
  persona: {
    id: number;
    name: string;
    confidenceScore: number | null;
    reasoning: string | null;
    groupName: string | null;
    groupId: number | null;
  } | null;
  sourceRoles: {
    id: number;
    roleId: string;
    roleName: string;
    domain: string | null;
    system: string | null;
  }[];
  targetRoleAssignments: {
    id: number;
    targetRoleId: number;
    roleName: string;
    roleId: string;
    status: string;
    assignmentType: string;
    domain: string | null;
    releasePhase: string;
  }[];
  sodConflicts: {
    id: number;
    severity: string;
    ruleName: string;
    ruleDescription: string | null;
    riskExplanation: string | null;
    resolutionStatus: string;
    permissionIdA: string | null;
    permissionIdB: string | null;
    roleIdA: number | null;
    roleIdB: number | null;
    roleNameA: string | null;
    roleNameB: string | null;
  }[];
}

export async function getUserDetail(id: number): Promise<UserDetail | null> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
  if (!user) return null;

  const [assignment] = await db
    .select({
      personaId: schema.userPersonaAssignments.personaId,
      confidenceScore: schema.userPersonaAssignments.confidenceScore,
      reasoning: schema.userPersonaAssignments.aiReasoning,
      personaName: schema.personas.name,
      groupName: schema.consolidatedGroups.name,
      groupId: schema.personas.consolidatedGroupId,
    })
    .from(schema.userPersonaAssignments)
    .leftJoin(schema.personas, eq(schema.personas.id, schema.userPersonaAssignments.personaId))
    .leftJoin(schema.consolidatedGroups, eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId))
    .where(eq(schema.userPersonaAssignments.userId, id));

  const sourceRoles = await db
    .select({
      id: schema.sourceRoles.id,
      roleId: schema.sourceRoles.roleId,
      roleName: schema.sourceRoles.roleName,
      domain: schema.sourceRoles.domain,
      system: schema.sourceRoles.system,
    })
    .from(schema.userSourceRoleAssignments)
    .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.userSourceRoleAssignments.sourceRoleId))
    .where(eq(schema.userSourceRoleAssignments.userId, id));

  const targetRoleAssignments = await db
    .select({
      id: schema.userTargetRoleAssignments.id,
      targetRoleId: schema.userTargetRoleAssignments.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleId: schema.targetRoles.roleId,
      status: schema.userTargetRoleAssignments.status,
      assignmentType: schema.userTargetRoleAssignments.assignmentType,
      domain: schema.targetRoles.domain,
      releasePhase: schema.userTargetRoleAssignments.releasePhase,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .where(eq(schema.userTargetRoleAssignments.userId, id));

  const sodConflictsRaw = await db
    .select({
      id: schema.sodConflicts.id,
      severity: schema.sodConflicts.severity,
      ruleName: schema.sodRules.ruleName,
      ruleDescription: schema.sodRules.riskDescription,
      riskExplanation: schema.sodConflicts.riskExplanation,
      resolutionStatus: schema.sodConflicts.resolutionStatus,
      permissionIdA: schema.sodConflicts.permissionIdA,
      permissionIdB: schema.sodConflicts.permissionIdB,
      roleIdA: schema.sodConflicts.roleIdA,
      roleIdB: schema.sodConflicts.roleIdB,
    })
    .from(schema.sodConflicts)
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .where(eq(schema.sodConflicts.userId, id));

  const sodConflicts = await Promise.all(sodConflictsRaw.map(async (c) => {
    const [roleA] = c.roleIdA
      ? await db.select({ roleName: schema.targetRoles.roleName }).from(schema.targetRoles).where(eq(schema.targetRoles.id, c.roleIdA))
      : [null];
    const [roleB] = c.roleIdB
      ? await db.select({ roleName: schema.targetRoles.roleName }).from(schema.targetRoles).where(eq(schema.targetRoles.id, c.roleIdB))
      : [null];
    return {
      ...c,
      roleNameA: roleA?.roleName ?? null,
      roleNameB: roleB?.roleName ?? null,
    };
  }));

  return {
    id: user.id,
    sourceUserId: user.sourceUserId,
    displayName: user.displayName,
    email: user.email,
    department: user.department,
    jobTitle: user.jobTitle,
    orgUnit: user.orgUnit,
    orgUnitId: user.orgUnitId,
    costCenter: user.costCenter,
    userType: user.userType,
    persona: assignment && assignment.personaId
      ? {
          id: assignment.personaId,
          name: assignment.personaName!,
          confidenceScore: assignment.confidenceScore,
          reasoning: assignment.reasoning,
          groupName: assignment.groupName,
          groupId: assignment.groupId,
        }
      : null,
    sourceRoles,
    targetRoleAssignments,
    sodConflicts,
  };
}

// ─────────────────────────────────────────────
// USER-LEVEL GAP ANALYSIS
// ─────────────────────────────────────────────

export interface UserGapAnalysis {
  sourcePermissions: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[];
  targetPermissions: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[];
  uncoveredPermissions: { permissionId: string; permissionName: string | null; system: string | null; sourceRoles: string[] }[];
  newPermissions: { permissionId: string; permissionName: string | null; system: string | null; targetRoles: string[] }[];
  coveragePercent: number;
}

export async function getUserGapAnalysis(userId: number): Promise<UserGapAnalysis> {
  // Get user's source permissions (via source role assignments → source roles → source role permissions)
  const sourceRoleAssignments = await db
    .select({
      roleId: schema.sourceRoles.id,
      roleName: schema.sourceRoles.roleName,
    })
    .from(schema.userSourceRoleAssignments)
    .innerJoin(schema.sourceRoles, eq(schema.userSourceRoleAssignments.sourceRoleId, schema.sourceRoles.id))
    .where(eq(schema.userSourceRoleAssignments.userId, userId));

  const sourcePerms: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[] = [];
  const sourcePermMap = new Map<string, string[]>(); // permId → roleNames

  for (const role of sourceRoleAssignments) {
    const perms = await db
      .select({
        permissionId: schema.sourcePermissions.permissionId,
        permissionName: schema.sourcePermissions.permissionName,
        system: schema.sourcePermissions.system,
      })
      .from(schema.sourceRolePermissions)
      .innerJoin(schema.sourcePermissions, eq(schema.sourceRolePermissions.sourcePermissionId, schema.sourcePermissions.id))
      .where(eq(schema.sourceRolePermissions.sourceRoleId, role.roleId));

    for (const p of perms) {
      sourcePerms.push({ ...p, roleName: role.roleName });
      if (!sourcePermMap.has(p.permissionId)) sourcePermMap.set(p.permissionId, []);
      if (!sourcePermMap.get(p.permissionId)!.includes(role.roleName)) {
        sourcePermMap.get(p.permissionId)!.push(role.roleName);
      }
    }
  }

  // Get user's target permissions (via target role assignments → target roles → target role permissions)
  const targetRoleAssignments = await db
    .select({
      roleId: schema.targetRoles.id,
      roleName: schema.targetRoles.roleName,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.targetRoles, eq(schema.userTargetRoleAssignments.targetRoleId, schema.targetRoles.id))
    .where(eq(schema.userTargetRoleAssignments.userId, userId));

  const targetPerms: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[] = [];
  const targetPermMap = new Map<string, string[]>(); // permId → roleNames

  for (const role of targetRoleAssignments) {
    const perms = await db
      .select({
        permissionId: schema.targetPermissions.permissionId,
        permissionName: schema.targetPermissions.permissionName,
        system: schema.targetPermissions.system,
      })
      .from(schema.targetRolePermissions)
      .innerJoin(schema.targetPermissions, eq(schema.targetRolePermissions.targetPermissionId, schema.targetPermissions.id))
      .where(eq(schema.targetRolePermissions.targetRoleId, role.roleId));

    for (const p of perms) {
      targetPerms.push({ ...p, roleName: role.roleName });
      if (!targetPermMap.has(p.permissionId)) targetPermMap.set(p.permissionId, []);
      if (!targetPermMap.get(p.permissionId)!.includes(role.roleName)) {
        targetPermMap.get(p.permissionId)!.push(role.roleName);
      }
    }
  }

  // Source permission IDs and target permission IDs (unique)
  const sourcePermIds = new Set(Array.from(sourcePermMap.keys()));
  const targetPermIds = new Set(Array.from(targetPermMap.keys()));

  // Uncovered: source perms not in target
  const uncovered: UserGapAnalysis["uncoveredPermissions"] = [];
  const seen = new Set<string>();
  for (const p of sourcePerms) {
    if (!targetPermIds.has(p.permissionId) && !seen.has(p.permissionId)) {
      seen.add(p.permissionId);
      uncovered.push({
        permissionId: p.permissionId,
        permissionName: p.permissionName,
        system: p.system,
        sourceRoles: sourcePermMap.get(p.permissionId) || [],
      });
    }
  }

  // New: target perms not in source
  const newPerms: UserGapAnalysis["newPermissions"] = [];
  const seenNew = new Set<string>();
  for (const p of targetPerms) {
    if (!sourcePermIds.has(p.permissionId) && !seenNew.has(p.permissionId)) {
      seenNew.add(p.permissionId);
      newPerms.push({
        permissionId: p.permissionId,
        permissionName: p.permissionName,
        system: p.system,
        targetRoles: targetPermMap.get(p.permissionId) || [],
      });
    }
  }

  const totalSource = sourcePermIds.size;
  const covered = totalSource - uncovered.length;
  const coveragePercent = totalSource > 0 ? Math.round((covered / totalSource) * 100) : 100;

  return {
    sourcePermissions: sourcePerms,
    targetPermissions: targetPerms,
    uncoveredPermissions: uncovered,
    newPermissions: newPerms,
    coveragePercent,
  };
}

// ─────────────────────────────────────────────
// PERSONAS
// ─────────────────────────────────────────────

export interface PersonaRow {
  id: number;
  name: string;
  description: string | null;
  businessFunction: string | null;
  groupName: string | null;
  groupId: number | null;
  source: string;
  userCount: number;
}

export async function getPersonas(): Promise<PersonaRow[]> {
  return await db
    .select({
      id: schema.personas.id,
      name: schema.personas.name,
      description: schema.personas.description,
      businessFunction: schema.personas.businessFunction,
      groupName: schema.consolidatedGroups.name,
      groupId: schema.personas.consolidatedGroupId,
      source: schema.personas.source,
      userCount: sql<number>`(
        SELECT count(*) FROM user_persona_assignments upa
        WHERE upa.persona_id = personas.id
      )`,
    })
    .from(schema.personas)
    .leftJoin(
      schema.consolidatedGroups,
      eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId)
    );
}

export interface PersonaDetail {
  id: number;
  name: string;
  description: string | null;
  businessFunction: string | null;
  source: string;
  groupName: string | null;
  groupId: number | null;
  sourcePermissions: {
    id: number;
    permissionId: string;
    permissionName: string | null;
    weight: number | null;
    isRequired: boolean | null;
  }[];
  users: {
    id: number;
    displayName: string;
    department: string | null;
    jobTitle: string | null;
    confidenceScore: number | null;
  }[];
  targetRoleMappings: {
    id: number;
    targetRoleId: number;
    roleName: string;
    roleId: string;
    coveragePercent: number | null;
    excessPercent: number | null;
    confidence: string | null;
    roleOwner: string | null;
  }[];
}

export async function getPersonaDetail(id: number): Promise<PersonaDetail | null> {
  const [persona] = await db
    .select({
      id: schema.personas.id,
      name: schema.personas.name,
      description: schema.personas.description,
      businessFunction: schema.personas.businessFunction,
      source: schema.personas.source,
      groupName: schema.consolidatedGroups.name,
      groupId: schema.personas.consolidatedGroupId,
    })
    .from(schema.personas)
    .leftJoin(schema.consolidatedGroups, eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId))
    .where(eq(schema.personas.id, id));

  if (!persona) return null;

  const sourcePermissions = await db
    .select({
      id: schema.sourcePermissions.id,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      weight: schema.personaSourcePermissions.weight,
      isRequired: schema.personaSourcePermissions.isRequired,
    })
    .from(schema.personaSourcePermissions)
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.personaSourcePermissions.sourcePermissionId))
    .where(eq(schema.personaSourcePermissions.personaId, id));

  const users = await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      department: schema.users.department,
      jobTitle: schema.users.jobTitle,
      confidenceScore: schema.userPersonaAssignments.confidenceScore,
    })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
    .where(eq(schema.userPersonaAssignments.personaId, id));

  const targetRoleMappings = await db
    .select({
      id: schema.personaTargetRoleMappings.id,
      targetRoleId: schema.personaTargetRoleMappings.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleId: schema.targetRoles.roleId,
      roleOwner: schema.targetRoles.roleOwner,
      coveragePercent: schema.personaTargetRoleMappings.coveragePercent,
      excessPercent: schema.personaTargetRoleMappings.excessPercent,
      confidence: schema.personaTargetRoleMappings.confidence,
    })
    .from(schema.personaTargetRoleMappings)
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.personaTargetRoleMappings.targetRoleId))
    .where(eq(schema.personaTargetRoleMappings.personaId, id));

  return {
    ...persona,
    sourcePermissions,
    users,
    targetRoleMappings,
  };
}

// ─────────────────────────────────────────────
// CONSOLIDATED GROUPS
// ─────────────────────────────────────────────

export interface GroupRow {
  id: number;
  name: string;
  description: string | null;
  accessLevel: string | null;
  domain: string | null;
  personaCount: number;
  userCount: number;
}

export async function getConsolidatedGroups(): Promise<GroupRow[]> {
  return await db
    .select({
      id: schema.consolidatedGroups.id,
      name: schema.consolidatedGroups.name,
      description: schema.consolidatedGroups.description,
      accessLevel: schema.consolidatedGroups.accessLevel,
      domain: schema.consolidatedGroups.domain,
      personaCount: sql<number>`(
        SELECT count(*) FROM personas p
        WHERE p.consolidated_group_id = consolidated_groups.id
      )`,
      userCount: sql<number>`(
        SELECT count(*) FROM user_persona_assignments upa
        INNER JOIN personas p ON p.id = upa.persona_id
        WHERE p.consolidated_group_id = consolidated_groups.id
      )`,
    })
    .from(schema.consolidatedGroups);
}

// ─────────────────────────────────────────────
// SOURCE ROLES
// ─────────────────────────────────────────────

export interface SourceRoleRow {
  id: number;
  roleId: string;
  roleName: string;
  domain: string | null;
  system: string | null;
  roleOwner: string | null;
  permissionCount: number;
  userCount: number;
}

export async function getSourceRoles(): Promise<SourceRoleRow[]> {
  return await db
    .select({
      id: schema.sourceRoles.id,
      roleId: schema.sourceRoles.roleId,
      roleName: schema.sourceRoles.roleName,
      domain: schema.sourceRoles.domain,
      system: schema.sourceRoles.system,
      roleOwner: schema.sourceRoles.roleOwner,
      permissionCount: sql<number>`(
        SELECT count(*) FROM source_role_permissions srp
        WHERE srp.source_role_id = source_roles.id
      )`,
      userCount: sql<number>`(
        SELECT count(*) FROM user_source_role_assignments usra
        WHERE usra.source_role_id = source_roles.id
      )`,
    })
    .from(schema.sourceRoles);
}

export interface SourceRoleDetail {
  id: number;
  roleId: string;
  roleName: string;
  description: string | null;
  domain: string | null;
  system: string | null;
  roleType: string | null;
  permissions: {
    id: number;
    permissionId: string;
    permissionName: string | null;
    permissionType: string | null;
    riskLevel: string | null;
  }[];
}

export async function getSourceRoleDetail(id: number): Promise<SourceRoleDetail | null> {
  const [role] = await db.select().from(schema.sourceRoles).where(eq(schema.sourceRoles.id, id));
  if (!role) return null;

  const permissions = await db
    .select({
      id: schema.sourcePermissions.id,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      permissionType: schema.sourcePermissions.permissionType,
      riskLevel: schema.sourcePermissions.riskLevel,
    })
    .from(schema.sourceRolePermissions)
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.sourceRolePermissions.sourcePermissionId))
    .where(eq(schema.sourceRolePermissions.sourceRoleId, id));

  return { ...role, permissions };
}

// ─────────────────────────────────────────────
// TARGET ROLES
// ─────────────────────────────────────────────

export interface TargetRoleRow {
  id: number;
  roleId: string;
  roleName: string;
  description: string | null;
  domain: string | null;
  system: string | null;
  roleOwner: string | null;
  permissionCount: number;
}

export async function getTargetRoles(): Promise<TargetRoleRow[]> {
  return await db
    .select({
      id: schema.targetRoles.id,
      roleId: schema.targetRoles.roleId,
      roleName: schema.targetRoles.roleName,
      description: schema.targetRoles.description,
      domain: schema.targetRoles.domain,
      system: schema.targetRoles.system,
      roleOwner: schema.targetRoles.roleOwner,
      permissionCount: sql<number>`(
        SELECT count(*) FROM target_role_permissions trp
        WHERE trp.target_role_id = target_roles.id
      )`,
    })
    .from(schema.targetRoles);
}

export interface TargetPermissionInfo {
  id: number;
  permissionId: string;
  permissionName: string | null;
  permissionType: string | null;
  riskLevel: string | null;
}

export async function getTargetRolePermissions(roleId: number): Promise<TargetPermissionInfo[]> {
  return await db
    .select({
      id: schema.targetPermissions.id,
      permissionId: schema.targetPermissions.permissionId,
      permissionName: schema.targetPermissions.permissionName,
      permissionType: schema.targetPermissions.permissionType,
      riskLevel: schema.targetPermissions.riskLevel,
    })
    .from(schema.targetRolePermissions)
    .innerJoin(
      schema.targetPermissions,
      eq(schema.targetPermissions.id, schema.targetRolePermissions.targetPermissionId)
    )
    .where(eq(schema.targetRolePermissions.targetRoleId, roleId));
}

// ─────────────────────────────────────────────
// SOD RULES
// ─────────────────────────────────────────────

export interface SodRuleRow {
  id: number;
  ruleId: string;
  ruleName: string;
  description: string | null;
  permissionA: string;
  permissionB: string;
  severity: string;
  riskDescription: string | null;
  isActive: boolean | null;
}

export async function getSodRules(): Promise<SodRuleRow[]> {
  return await db.select().from(schema.sodRules);
}

// ─────────────────────────────────────────────
// SOD CONFLICTS
// ─────────────────────────────────────────────

export interface SodConflictRow {
  id: number;
  userId: number;
  userName: string;
  department: string | null;
  severity: string;
  conflictType: string;
  ruleName: string;
  ruleDescription: string | null;
  permissionIdA: string | null;
  permissionIdB: string | null;
  permissionNameA: string | null;
  permissionNameB: string | null;
  roleIdA: number | null;
  roleIdB: number | null;
  roleNameA: string | null;
  roleNameB: string | null;
  resolutionStatus: string;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  riskExplanation: string | null;
}

export async function getSodConflicts(): Promise<SodConflictRow[]> {
  const conflicts = await db
    .select({
      id: schema.sodConflicts.id,
      userId: schema.sodConflicts.userId,
      userName: schema.users.displayName,
      department: schema.users.department,
      severity: schema.sodConflicts.severity,
      conflictType: schema.sodConflicts.conflictType,
      ruleName: schema.sodRules.ruleName,
      ruleDescription: schema.sodRules.riskDescription,
      permissionIdA: schema.sodConflicts.permissionIdA,
      permissionIdB: schema.sodConflicts.permissionIdB,
      roleIdA: schema.sodConflicts.roleIdA,
      roleIdB: schema.sodConflicts.roleIdB,
      resolutionStatus: schema.sodConflicts.resolutionStatus,
      resolvedBy: schema.sodConflicts.resolvedBy,
      resolutionNotes: schema.sodConflicts.resolutionNotes,
      riskExplanation: schema.sodConflicts.riskExplanation,
    })
    .from(schema.sodConflicts)
    .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId));

  // Resolve role names and permission names
  return await Promise.all(conflicts.map(async (c) => {
    const [roleA] = c.roleIdA
      ? await db.select({ roleName: schema.targetRoles.roleName }).from(schema.targetRoles).where(eq(schema.targetRoles.id, c.roleIdA))
      : [null];
    const [roleB] = c.roleIdB
      ? await db.select({ roleName: schema.targetRoles.roleName }).from(schema.targetRoles).where(eq(schema.targetRoles.id, c.roleIdB))
      : [null];
    const [permA] = c.permissionIdA
      ? await db.select({ permissionName: schema.targetPermissions.permissionName }).from(schema.targetPermissions).where(eq(schema.targetPermissions.permissionId, c.permissionIdA))
      : [null];
    const [permB] = c.permissionIdB
      ? await db.select({ permissionName: schema.targetPermissions.permissionName }).from(schema.targetPermissions).where(eq(schema.targetPermissions.permissionId, c.permissionIdB))
      : [null];
    return {
      id: c.id,
      userId: c.userId,
      userName: c.userName,
      department: c.department,
      severity: c.severity,
      conflictType: c.conflictType,
      ruleName: c.ruleName,
      ruleDescription: c.ruleDescription,
      permissionIdA: c.permissionIdA,
      permissionIdB: c.permissionIdB,
      permissionNameA: permA?.permissionName ?? null,
      permissionNameB: permB?.permissionName ?? null,
      roleIdA: c.roleIdA,
      roleIdB: c.roleIdB,
      roleNameA: roleA?.roleName ?? null,
      roleNameB: roleB?.roleName ?? null,
      resolutionStatus: c.resolutionStatus,
      resolvedBy: c.resolvedBy,
      resolutionNotes: c.resolutionNotes,
      riskExplanation: c.riskExplanation,
    };
  }));
}

// ─────────────────────────────────────────────
// APPROVALS
// ─────────────────────────────────────────────

export interface ApprovalRow {
  assignmentId: number;
  userId: number;
  userName: string;
  department: string | null;
  personaName: string | null;
  personaId: number | null;
  targetRoleName: string;
  targetRoleId: string;
  status: string;
  assignmentType: string;
  confidenceScore: number | null;
  sodConflictCount: number | null;
}

export async function getApprovalQueue(): Promise<ApprovalRow[]> {
  return await db
    .select({
      assignmentId: schema.userTargetRoleAssignments.id,
      userId: schema.userTargetRoleAssignments.userId,
      userName: schema.users.displayName,
      department: schema.users.department,
      personaName: schema.personas.name,
      personaId: schema.userTargetRoleAssignments.derivedFromPersonaId,
      targetRoleName: schema.targetRoles.roleName,
      targetRoleId: schema.targetRoles.roleId,
      status: schema.userTargetRoleAssignments.status,
      assignmentType: schema.userTargetRoleAssignments.assignmentType,
      confidenceScore: sql<number | null>`(
        SELECT upa.confidence_score
        FROM user_persona_assignments upa
        WHERE upa.user_id = user_target_role_assignments.user_id
        LIMIT 1
      )`,
      sodConflictCount: schema.userTargetRoleAssignments.sodConflictCount,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .leftJoin(schema.personas, eq(schema.personas.id, schema.userTargetRoleAssignments.derivedFromPersonaId));
}

// ─────────────────────────────────────────────
// PROCESSING JOBS
// ─────────────────────────────────────────────

export interface JobRow {
  id: number;
  jobType: string;
  status: string;
  totalRecords: number | null;
  processed: number | null;
  failed: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  errorLog: string | null;
}

export async function getJobs(): Promise<JobRow[]> {
  return await db
    .select()
    .from(schema.processingJobs)
    .orderBy(desc(schema.processingJobs.createdAt));
}

// ─────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────

export interface AuditLogRow {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  actorEmail: string | null;
  createdAt: string;
}

export async function getAuditLog(): Promise<AuditLogRow[]> {
  return await db
    .select()
    .from(schema.auditLog)
    .orderBy(desc(schema.auditLog.createdAt));
}

// ─────────────────────────────────────────────
// SIMPLE LOOKUPS (for select lists)
// ─────────────────────────────────────────────

export interface SimpleUser {
  id: number;
  displayName: string;
  department: string | null;
}

export async function getAllSimpleUsers(): Promise<SimpleUser[]> {
  return await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      department: schema.users.department,
    })
    .from(schema.users);
}

export interface SimpleTargetRole {
  id: number;
  roleId: string;
  roleName: string;
  domain: string | null;
}

export async function getAllSimpleTargetRoles(): Promise<SimpleTargetRole[]> {
  return await db
    .select({
      id: schema.targetRoles.id,
      roleId: schema.targetRoles.roleId,
      roleName: schema.targetRoles.roleName,
      domain: schema.targetRoles.domain,
    })
    .from(schema.targetRoles);
}

// ─────────────────────────────────────────────
// DATA EXPLORER QUERIES
// ─────────────────────────────────────────────

export interface UserRoleAssignmentRow {
  id: number;
  userName: string;
  roleName: string;
  system: string | null;
  assignedDate: string | null;
}

export async function getUserSourceRoleAssignments(): Promise<UserRoleAssignmentRow[]> {
  return await db
    .select({
      id: schema.userSourceRoleAssignments.id,
      userName: schema.users.displayName,
      roleName: schema.sourceRoles.roleName,
      system: schema.sourceRoles.system,
      assignedDate: schema.userSourceRoleAssignments.assignedDate,
    })
    .from(schema.userSourceRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userSourceRoleAssignments.userId))
    .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.userSourceRoleAssignments.sourceRoleId));
}

export interface SourcePermissionRow {
  id: number;
  permissionId: string;
  permissionName: string | null;
  description: string | null;
  system: string | null;
  permissionType: string | null;
  riskLevel: string | null;
}

export async function getAllSourcePermissions(): Promise<SourcePermissionRow[]> {
  return await db.select().from(schema.sourcePermissions);
}

export interface TargetPermissionRow {
  id: number;
  permissionId: string;
  permissionName: string | null;
  description: string | null;
  system: string | null;
  permissionType: string | null;
  riskLevel: string | null;
}

export async function getAllTargetPermissions(): Promise<TargetPermissionRow[]> {
  return await db.select().from(schema.targetPermissions);
}

// ─────────────────────────────────────────────
// MAPPING WORKSPACE
// ─────────────────────────────────────────────

export interface PersonaMappingRow {
  personaId: number;
  personaName: string;
  groupName: string | null;
  userCount: number;
  mappedRoleCount: number;
  sourcePermissionCount: number;
}

export async function getPersonaMappingWorkspace(): Promise<PersonaMappingRow[]> {
  return await db
    .select({
      personaId: schema.personas.id,
      personaName: schema.personas.name,
      groupName: schema.consolidatedGroups.name,
      userCount: sql<number>`(
        SELECT count(*) FROM user_persona_assignments upa
        WHERE upa.persona_id = personas.id
      )`,
      mappedRoleCount: sql<number>`(
        SELECT count(*) FROM persona_target_role_mappings ptrm
        WHERE ptrm.persona_id = personas.id
      )`,
      sourcePermissionCount: sql<number>`(
        SELECT count(*) FROM persona_source_permissions psp
        WHERE psp.persona_id = personas.id
      )`,
    })
    .from(schema.personas)
    .leftJoin(schema.consolidatedGroups, eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId));
}

export interface UserRefinementRow {
  assignmentId: number;
  userId: number;
  userName: string;
  department: string | null;
  targetRoleName: string;
  assignmentType: string;
  status: string;
  personaName: string | null;
}

export async function getUserRefinements(): Promise<UserRefinementRow[]> {
  return await db
    .select({
      assignmentId: schema.userTargetRoleAssignments.id,
      userId: schema.userTargetRoleAssignments.userId,
      userName: schema.users.displayName,
      department: schema.users.department,
      targetRoleName: schema.targetRoles.roleName,
      assignmentType: schema.userTargetRoleAssignments.assignmentType,
      status: schema.userTargetRoleAssignments.status,
      personaName: schema.personas.name,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .leftJoin(schema.personas, eq(schema.personas.id, schema.userTargetRoleAssignments.derivedFromPersonaId))
    .where(ne(schema.userTargetRoleAssignments.assignmentType, "persona_default"));
}

export interface GapRow {
  gapId: number;
  personaId: number;
  personaName: string;
  permissionId: string;
  permissionName: string | null;
  gapType: string;
  notes: string | null;
}

export async function getGapAnalysis(): Promise<GapRow[]> {
  return await db
    .select({
      gapId: schema.permissionGaps.id,
      personaId: schema.permissionGaps.personaId,
      personaName: schema.personas.name,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      gapType: schema.permissionGaps.gapType,
      notes: schema.permissionGaps.notes,
    })
    .from(schema.permissionGaps)
    .innerJoin(schema.personas, eq(schema.personas.id, schema.permissionGaps.personaId))
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.permissionGaps.sourcePermissionId));
}

// ─────────────────────────────────────────────
// DEPARTMENT MAPPING STATUS
// ─────────────────────────────────────────────

export interface DepartmentMappingStatus {
  department: string;
  totalUsers: number;
  withPersona: number;
  mapped: number;
  sodRejected: number;
  sodClean: number;
  approved: number;
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

// ─────────────────────────────────────────────
// WORK ASSIGNMENTS (scope filtering)
// ─────────────────────────────────────────────

export async function getAssignedScope(appUserId: number, assignmentType: string): Promise<{ departments: string[]; userIds: string[] }> {
  const assignments = await db.select().from(schema.workAssignments)
    .where(and(
      eq(schema.workAssignments.appUserId, appUserId),
      eq(schema.workAssignments.assignmentType, assignmentType)
    ));

  const departments: string[] = [];
  const userIds: string[] = [];

  for (const a of assignments) {
    if (a.scopeType === "department") departments.push(a.scopeValue);
    else if (a.scopeType === "user") userIds.push(a.scopeValue);
  }

  return { departments, userIds };
}

export async function getSourceUserIdsInScope(scope: { departments: string[]; userIds: string[] }): Promise<number[]> {
  const ids = new Set<number>();

  if (scope.departments.length > 0) {
    const users = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.department, scope.departments));
    for (const u of users) ids.add(u.id);
  }

  if (scope.userIds.length > 0) {
    const users = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.sourceUserId, scope.userIds));
    for (const u of users) ids.add(u.id);
  }

  return Array.from(ids);
}

export async function getApprovalQueueScoped(appUserId: number): Promise<ApprovalRow[]> {
  const scope = await getAssignedScope(appUserId, "approver");
  const all = await getApprovalQueue();

  // If no assignments, return empty (not everything)
  if (scope.departments.length === 0 && scope.userIds.length === 0) return [];

  const scopedUserIds = await getSourceUserIdsInScope(scope);
  const idSet = new Set(scopedUserIds);
  return all.filter((a) => idSet.has(a.userId));
}

export async function getUsersScoped(appUserId: number, assignmentType: string): Promise<UserRow[]> {
  const scope = await getAssignedScope(appUserId, assignmentType);
  const all = await getUsers();

  if (scope.departments.length === 0 && scope.userIds.length === 0) return [];

  const scopedUserIds = await getSourceUserIdsInScope(scope);
  const idSet = new Set(scopedUserIds);
  return all.filter((u) => idSet.has(u.id));
}

// ─────────────────────────────────────────────
// SOD CONFLICTS BY PERSONA (for mapping workspace warnings)
// ─────────────────────────────────────────────

export interface PersonaSodConflict {
  personaId: number;
  conflictId: number;
  userId: number;
  userName: string;
  severity: string;
  ruleName: string;
  permissionIdA: string | null;
  permissionIdB: string | null;
  roleIdA: number | null;
  roleIdB: number | null;
  roleNameA: string | null;
  roleNameB: string | null;
}

export async function getOpenSodConflictsByPersona(): Promise<Map<number, PersonaSodConflict[]>> {
  // Get all open SOD conflicts with user-persona info
  const rows = await db
    .select({
      conflictId: schema.sodConflicts.id,
      userId: schema.sodConflicts.userId,
      userName: schema.users.displayName,
      severity: schema.sodConflicts.severity,
      ruleName: schema.sodRules.ruleName,
      permissionIdA: schema.sodConflicts.permissionIdA,
      permissionIdB: schema.sodConflicts.permissionIdB,
      roleIdA: schema.sodConflicts.roleIdA,
      roleIdB: schema.sodConflicts.roleIdB,
      personaId: schema.userPersonaAssignments.personaId,
    })
    .from(schema.sodConflicts)
    .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .innerJoin(schema.userPersonaAssignments, eq(schema.userPersonaAssignments.userId, schema.sodConflicts.userId))
    .where(eq(schema.sodConflicts.resolutionStatus, "open"));

  const result = new Map<number, PersonaSodConflict[]>();
  for (const r of rows) {
    if (!r.personaId) continue;
    const [roleA] = r.roleIdA
      ? await db.select({ roleName: schema.targetRoles.roleName }).from(schema.targetRoles).where(eq(schema.targetRoles.id, r.roleIdA))
      : [null];
    const [roleB] = r.roleIdB
      ? await db.select({ roleName: schema.targetRoles.roleName }).from(schema.targetRoles).where(eq(schema.targetRoles.id, r.roleIdB))
      : [null];
    const entry: PersonaSodConflict = {
      personaId: r.personaId,
      conflictId: r.conflictId,
      userId: r.userId,
      userName: r.userName,
      severity: r.severity,
      ruleName: r.ruleName,
      permissionIdA: r.permissionIdA,
      permissionIdB: r.permissionIdB,
      roleIdA: r.roleIdA,
      roleIdB: r.roleIdB,
      roleNameA: roleA?.roleName ?? null,
      roleNameB: roleB?.roleName ?? null,
    };
    const existing = result.get(r.personaId) || [];
    existing.push(entry);
    result.set(r.personaId, existing);
  }
  return result;
}

export async function getPersonaIdsForUsers(userIds: number[]): Promise<number[]> {
  if (userIds.length === 0) return [];
  const idSet = new Set(userIds);
  const assignments = await db.select({
    personaId: schema.userPersonaAssignments.personaId,
    userId: schema.userPersonaAssignments.userId,
  }).from(schema.userPersonaAssignments);

  const personaIds = new Set<number>();
  for (const a of assignments) {
    if (a.personaId && idSet.has(a.userId)) personaIds.add(a.personaId);
  }
  return Array.from(personaIds);
}

// ─────────────────────────────────────────────
// SOURCE SYSTEM STATS (multi-system support)
// ─────────────────────────────────────────────

export interface SourceSystemStat {
  system: string;
  roleCount: number;
  userCount: number;
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

export interface PersonaSourceSystemInfo {
  personaId: number;
  systems: string[];
}

export async function getPersonaSourceSystems(): Promise<Map<number, string[]>> {
  const rows = await db
    .select({
      personaId: schema.personaSourcePermissions.personaId,
      system: sql<string>`coalesce(${schema.sourcePermissions.system}, 'Unknown')`,
    })
    .from(schema.personaSourcePermissions)
    .innerJoin(
      schema.sourcePermissions,
      eq(schema.sourcePermissions.id, schema.personaSourcePermissions.sourcePermissionId)
    )
    .groupBy(schema.personaSourcePermissions.personaId, schema.sourcePermissions.system);

  const map = new Map<number, string[]>();
  for (const row of rows) {
    const existing = map.get(row.personaId) ?? [];
    if (!existing.includes(row.system)) existing.push(row.system);
    map.set(row.personaId, existing);
  }
  return map;
}

// ─────────────────────────────────────────────
// SOD CONFLICTS — DETAILED (for resolution workspace)
// ─────────────────────────────────────────────

export interface RolePermissionImpact {
  roleId: number;
  roleName: string;
  roleCode: string;
  permissions: { permissionId: string; permissionName: string | null }[];
}

export interface SodConflictDetailed extends SodConflictRow {
  roleAPermissions: { permissionId: string; permissionName: string | null }[];
  roleBPermissions: { permissionId: string; permissionName: string | null }[];
}

export async function getSodConflictsDetailed(): Promise<SodConflictDetailed[]> {
  const base = await getSodConflicts();

  return await Promise.all(base.map(async (c) => {
    const roleAPermissions = c.roleIdA
      ? await db.select({
          permissionId: schema.targetPermissions.permissionId,
          permissionName: schema.targetPermissions.permissionName,
        })
        .from(schema.targetRolePermissions)
        .innerJoin(schema.targetPermissions, eq(schema.targetPermissions.id, schema.targetRolePermissions.targetPermissionId))
        .where(eq(schema.targetRolePermissions.targetRoleId, c.roleIdA))
      : [];

    const roleBPermissions = c.roleIdB
      ? await db.select({
          permissionId: schema.targetPermissions.permissionId,
          permissionName: schema.targetPermissions.permissionName,
        })
        .from(schema.targetRolePermissions)
        .innerJoin(schema.targetPermissions, eq(schema.targetPermissions.id, schema.targetRolePermissions.targetPermissionId))
        .where(eq(schema.targetRolePermissions.targetRoleId, c.roleIdB))
      : [];

    return { ...c, roleAPermissions, roleBPermissions };
  }));
}

export async function getSodConflictDetail(conflictId: number): Promise<SodConflictDetailed | null> {
  const all = await getSodConflictsDetailed();
  return all.find(c => c.id === conflictId) ?? null;
}

// ─────────────────────────────────────────────
// ASSIGNED MAPPER / APPROVER for a user's org unit
// ─────────────────────────────────────────────

export interface AssignedMapperApprover {
  mapperName: string | null;
  mapperOrgUnitName: string | null;
  approverName: string | null;
  approverOrgUnitName: string | null;
}

/**
 * Finds the mapper and approver assigned to a user's org unit.
 * Walks up the org hierarchy from the user's org unit to find
 * the closest mapper/approver assignment.
 */
export async function getAssignedMapperApproverForUser(orgUnitId: number | null): Promise<AssignedMapperApprover> {
  if (!orgUnitId) return { mapperName: null, mapperOrgUnitName: null, approverName: null, approverOrgUnitName: null };

  // Get all org units to build the ancestry chain
  const allOrgUnits = await db.select().from(schema.orgUnits);
  const orgUnitMap = new Map(allOrgUnits.map(u => [u.id, u]));

  // Get all app user assignments
  const appUserAssignments = await db.select({
    displayName: schema.appUsers.displayName,
    role: schema.appUsers.role,
    assignedOrgUnitId: schema.appUsers.assignedOrgUnitId,
  }).from(schema.appUsers).where(eq(schema.appUsers.isActive, true));

  const mapperByOu = new Map<number, string>();
  const approverByOu = new Map<number, string>();
  for (const au of appUserAssignments) {
    if (au.assignedOrgUnitId) {
      if (au.role === "mapper") mapperByOu.set(au.assignedOrgUnitId, au.displayName);
      if (au.role === "approver") approverByOu.set(au.assignedOrgUnitId, au.displayName);
    }
  }

  // Walk up the org hierarchy to find the closest assignment
  let mapperName: string | null = null;
  let mapperOrgUnitName: string | null = null;
  let approverName: string | null = null;
  let approverOrgUnitName: string | null = null;
  let currentId: number | null = orgUnitId;

  while (currentId !== null) {
    if (!mapperName && mapperByOu.has(currentId)) {
      mapperName = mapperByOu.get(currentId)!;
      mapperOrgUnitName = orgUnitMap.get(currentId)?.name ?? null;
    }
    if (!approverName && approverByOu.has(currentId)) {
      approverName = approverByOu.get(currentId)!;
      approverOrgUnitName = orgUnitMap.get(currentId)?.name ?? null;
    }
    if (mapperName && approverName) break;

    const unit = orgUnitMap.get(currentId);
    currentId = unit?.parentId ?? null;
  }

  return { mapperName, mapperOrgUnitName, approverName, approverOrgUnitName };
}

// ─────────────────────────────────────────────
// GAP ANALYSIS (computed coverage summary)
// ─────────────────────────────────────────────

export interface GapAnalysisSummary {
  totalSourcePermissions: number;
  coveredPermissions: number;
  coveragePercent: number;
  gapsByPersona: {
    personaId: number;
    personaName: string;
    totalPermissions: number;
    uncoveredCount: number;
    uncoveredPermissions: {
      permissionId: string;
      permissionName: string | null;
      description: string | null;
    }[];
  }[];
}

/**
 * Computes gap analysis by comparing source permissions (via personas)
 * against target role permissions to find uncovered permissions.
 * Uses the permission_gaps table if populated.
 */
export async function getGapAnalysisSummary(): Promise<GapAnalysisSummary> {
  const allPersonaPerms = await db
    .select({
      personaId: schema.personaSourcePermissions.personaId,
      sourcePermissionId: schema.personaSourcePermissions.sourcePermissionId,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      description: schema.sourcePermissions.description,
    })
    .from(schema.personaSourcePermissions)
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.personaSourcePermissions.sourcePermissionId));

  const personas = await db
    .select({ id: schema.personas.id, name: schema.personas.name })
    .from(schema.personas);

  const personaNameMap = new Map(personas.map(p => [p.id, p.name]));

  // Get all gaps from the permission_gaps table
  const gaps = await db
    .select({
      personaId: schema.permissionGaps.personaId,
      sourcePermissionId: schema.permissionGaps.sourcePermissionId,
    })
    .from(schema.permissionGaps);

  const gapSet = new Set(gaps.map(g => `${g.personaId}-${g.sourcePermissionId}`));

  // Group by persona
  const permsByPersona = new Map<number, typeof allPersonaPerms>();
  for (const p of allPersonaPerms) {
    const existing = permsByPersona.get(p.personaId) || [];
    existing.push(p);
    permsByPersona.set(p.personaId, existing);
  }

  const totalSourcePermissions = new Set(allPersonaPerms.map(p => p.sourcePermissionId)).size;
  const allUncoveredPermIds = new Set<number>();

  const gapsByPersona: GapAnalysisSummary["gapsByPersona"] = [];

  for (const [personaId, perms] of Array.from(permsByPersona)) {
    const uncoveredPermissions: { permissionId: string; permissionName: string | null; description: string | null }[] = [];
    for (const p of perms) {
      if (gapSet.has(`${personaId}-${p.sourcePermissionId}`)) {
        uncoveredPermissions.push({
          permissionId: p.permissionId,
          permissionName: p.permissionName,
          description: p.description,
        });
        allUncoveredPermIds.add(p.sourcePermissionId);
      }
    }

    if (uncoveredPermissions.length > 0) {
      gapsByPersona.push({
        personaId,
        personaName: personaNameMap.get(personaId) ?? "Unknown",
        totalPermissions: perms.length,
        uncoveredCount: uncoveredPermissions.length,
        uncoveredPermissions,
      });
    }
  }

  const coveredPermissions = totalSourcePermissions - allUncoveredPermIds.size;
  const coveragePercent = totalSourcePermissions > 0 ? Math.round((coveredPermissions / totalSourcePermissions) * 100) : 100;

  return {
    totalSourcePermissions,
    coveredPermissions,
    coveragePercent,
    gapsByPersona,
  };
}

// ─────────────────────────────────────────────
// USER REFINEMENTS (enhanced for editing)
// ─────────────────────────────────────────────

export interface UserRefinementDetail {
  userId: number;
  userName: string;
  department: string | null;
  personaName: string | null;
  personaId: number | null;
  personaDefaultRoles: { targetRoleId: number; roleName: string; roleId: string }[];
  individualOverrides: { assignmentId: number; targetRoleId: number; roleName: string; roleId: string; assignmentType: string; status: string; releasePhase: string; personaMappingChangedAt: string | null }[];
  allAssignments: { assignmentId: number; targetRoleId: number; roleName: string; roleId: string; assignmentType: string; status: string; releasePhase: string; personaMappingChangedAt: string | null }[];
  hasPersonaCascadeFlag: boolean;
  existingAccessRoles: { assignmentId: number; targetRoleId: number; roleName: string; roleId: string }[];
}

/**
 * Gets all users who have target role assignments, including both
 * persona defaults and individual overrides for the refinements tab.
 */
export async function getUserRefinementDetails(): Promise<UserRefinementDetail[]> {
  const assignments = await db
    .select({
      assignmentId: schema.userTargetRoleAssignments.id,
      userId: schema.userTargetRoleAssignments.userId,
      userName: schema.users.displayName,
      department: schema.users.department,
      targetRoleId: schema.userTargetRoleAssignments.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleId: schema.targetRoles.roleId,
      assignmentType: schema.userTargetRoleAssignments.assignmentType,
      status: schema.userTargetRoleAssignments.status,
      derivedFromPersonaId: schema.userTargetRoleAssignments.derivedFromPersonaId,
      releasePhase: schema.userTargetRoleAssignments.releasePhase,
      personaMappingChangedAt: schema.userTargetRoleAssignments.personaMappingChangedAt,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId));

  const personaAssignments = await db
    .select({
      userId: schema.userPersonaAssignments.userId,
      personaId: schema.userPersonaAssignments.personaId,
      personaName: schema.personas.name,
    })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.personas, eq(schema.personas.id, schema.userPersonaAssignments.personaId));

  const personaByUser = new Map(personaAssignments.map(pa => [pa.userId, pa]));

  const personaMappings = await db
    .select({
      personaId: schema.personaTargetRoleMappings.personaId,
      targetRoleId: schema.personaTargetRoleMappings.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleId: schema.targetRoles.roleId,
    })
    .from(schema.personaTargetRoleMappings)
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.personaTargetRoleMappings.targetRoleId));

  const defaultRolesByPersona = new Map<number, { targetRoleId: number; roleName: string; roleId: string }[]>();
  for (const m of personaMappings) {
    const existing = defaultRolesByPersona.get(m.personaId) || [];
    existing.push({ targetRoleId: m.targetRoleId, roleName: m.roleName, roleId: m.roleId });
    defaultRolesByPersona.set(m.personaId, existing);
  }

  const byUser = new Map<number, typeof assignments>();
  for (const a of assignments) {
    const existing = byUser.get(a.userId) || [];
    existing.push(a);
    byUser.set(a.userId, existing);
  }

  const result: UserRefinementDetail[] = [];
  for (const [userId, userAssignments] of Array.from(byUser)) {
    const first = userAssignments[0];
    const persona = personaByUser.get(userId);
    const personaDefaults = persona?.personaId ? (defaultRolesByPersona.get(persona.personaId) ?? []) : [];

    // Separate existing (previous wave) from current assignments
    const currentAssignments = userAssignments.filter(a => a.releasePhase !== "existing");
    const existingRoles = userAssignments.filter(a => a.releasePhase === "existing");

    result.push({
      userId,
      userName: first.userName,
      department: first.department,
      personaName: persona?.personaName ?? null,
      personaId: persona?.personaId ?? null,
      personaDefaultRoles: personaDefaults,
      individualOverrides: currentAssignments
        .filter(a => a.assignmentType !== "persona_default")
        .map(a => ({ assignmentId: a.assignmentId, targetRoleId: a.targetRoleId, roleName: a.roleName, roleId: a.roleId, assignmentType: a.assignmentType, status: a.status, releasePhase: a.releasePhase, personaMappingChangedAt: a.personaMappingChangedAt ?? null })),
      allAssignments: currentAssignments.map(a => ({ assignmentId: a.assignmentId, targetRoleId: a.targetRoleId, roleName: a.roleName, roleId: a.roleId, assignmentType: a.assignmentType, status: a.status, releasePhase: a.releasePhase, personaMappingChangedAt: a.personaMappingChangedAt ?? null })),
      hasPersonaCascadeFlag: currentAssignments.some(a => a.personaMappingChangedAt !== null),
      existingAccessRoles: existingRoles.map(a => ({ assignmentId: a.assignmentId, targetRoleId: a.targetRoleId, roleName: a.roleName, roleId: a.roleId })),
    });
  }

  return result;
}

// ─────────────────────────────────────────────
// LEAST ACCESS ANALYSIS
// ─────────────────────────────────────────────

export interface LeastAccessRow {
  personaId: number;
  personaName: string;
  groupName: string | null;
  userCount: number;
  mappingId: number;
  targetRoleId: number;
  roleName: string;
  roleId: string;
  coveragePercent: number | null;
  excessPercent: number;
  exceptionId: number | null;
  exceptionStatus: string | null;
  exceptionJustification: string | null;
  exceptionAcceptedBy: string | null;
  exceptionAcceptedAt: string | null;
}

export async function getLeastAccessAnalysis(threshold: number): Promise<LeastAccessRow[]> {
  const rows = await db
    .select({
      personaId: schema.personaTargetRoleMappings.personaId,
      personaName: schema.personas.name,
      groupName: schema.consolidatedGroups.name,
      mappingId: schema.personaTargetRoleMappings.id,
      targetRoleId: schema.personaTargetRoleMappings.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleId: schema.targetRoles.roleId,
      coveragePercent: schema.personaTargetRoleMappings.coveragePercent,
      excessPercent: schema.personaTargetRoleMappings.excessPercent,
      exceptionId: schema.leastAccessExceptions.id,
      exceptionStatus: schema.leastAccessExceptions.status,
      exceptionJustification: schema.leastAccessExceptions.justification,
      exceptionAcceptedBy: schema.leastAccessExceptions.acceptedBy,
      exceptionAcceptedAt: schema.leastAccessExceptions.acceptedAt,
    })
    .from(schema.personaTargetRoleMappings)
    .innerJoin(schema.personas, eq(schema.personas.id, schema.personaTargetRoleMappings.personaId))
    .leftJoin(schema.consolidatedGroups, eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.personaTargetRoleMappings.targetRoleId))
    .leftJoin(
      schema.leastAccessExceptions,
      and(
        eq(schema.leastAccessExceptions.personaId, schema.personaTargetRoleMappings.personaId),
        eq(schema.leastAccessExceptions.targetRoleId, schema.personaTargetRoleMappings.targetRoleId),
        eq(schema.leastAccessExceptions.status, "accepted"),
      )
    )
    .where(sql`${schema.personaTargetRoleMappings.excessPercent} >= ${threshold}`);

  const userCounts = await db
    .select({
      personaId: schema.userPersonaAssignments.personaId,
      count: count(),
    })
    .from(schema.userPersonaAssignments)
    .groupBy(schema.userPersonaAssignments.personaId);
  const userCountMap = new Map(userCounts.map(u => [u.personaId, u.count]));

  return rows
    .filter(r => r.excessPercent !== null)
    .map(r => ({
      ...r,
      excessPercent: r.excessPercent!,
      userCount: userCountMap.get(r.personaId) ?? 0,
    }));
}

// ─────────────────────────────────────────────
// AGGREGATE RISK ANALYSIS
// ─────────────────────────────────────────────

export interface FlaggedUser {
  userId: number;
  userName: string;
  department: string | null;
  coveragePercent: number;
  uncoveredPermCount: number;
  newPermCount: number;
  sodConflictCount: number;
}

export interface AggregateRiskAnalysis {
  businessContinuity: {
    usersAtRisk: number;
    totalUncoveredPerms: number;
    avgCoverage: number;
  };
  adoption: {
    usersWithNewAccess: number;
    totalNewPerms: number;
  };
  incorrectAccess: {
    flaggedUsers: number;
    flaggedUserList: FlaggedUser[];
  };
  totalUsersAnalyzed: number;
}

/**
 * Bulk risk analysis across all users (or scoped users).
 * Avoids N+1 by doing bulk queries and computing in memory.
 */
export async function getAggregateRiskAnalysis(
  scopedUserIds: number[] | null = null
): Promise<AggregateRiskAnalysis> {
  // 1. Get all users with target role assignments (these are the ones we can analyze)
  let usersWithAssignments: { id: number; displayName: string; department: string | null }[];

  if (scopedUserIds !== null && scopedUserIds.length > 0) {
    usersWithAssignments = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        department: schema.users.department,
      })
      .from(schema.users)
      .where(inArray(schema.users.id, scopedUserIds));
  } else {
    usersWithAssignments = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        department: schema.users.department,
      })
      .from(schema.users);
  }

  const userIds = usersWithAssignments.map(u => u.id);
  if (userIds.length === 0) {
    return {
      businessContinuity: { usersAtRisk: 0, totalUncoveredPerms: 0, avgCoverage: 100 },
      adoption: { usersWithNewAccess: 0, totalNewPerms: 0 },
      incorrectAccess: { flaggedUsers: 0, flaggedUserList: [] },
      totalUsersAnalyzed: 0,
    };
  }

  // 2-4. Bulk load source assignments, target assignments, and SOD conflicts in PARALLEL
  const [sourceRoleAssignments, targetRoleAssignments, sodConflictRows] = await Promise.all([
    db.select({
      userId: schema.userSourceRoleAssignments.userId,
      sourceRoleId: schema.userSourceRoleAssignments.sourceRoleId,
    })
    .from(schema.userSourceRoleAssignments)
    .where(inArray(schema.userSourceRoleAssignments.userId, userIds)),

    db.select({
      userId: schema.userTargetRoleAssignments.userId,
      targetRoleId: schema.userTargetRoleAssignments.targetRoleId,
    })
    .from(schema.userTargetRoleAssignments)
    .where(inArray(schema.userTargetRoleAssignments.userId, userIds)),

    db.select({
      userId: schema.sodConflicts.userId,
      count: count(),
    })
    .from(schema.sodConflicts)
    .where(inArray(schema.sodConflicts.userId, userIds))
    .groupBy(schema.sodConflicts.userId),
  ]);

  // Load source and target permission mappings in parallel
  const allSourceRoleIds = Array.from(new Set(sourceRoleAssignments.map(a => a.sourceRoleId)));
  const allTargetRoleIds = Array.from(new Set(targetRoleAssignments.map(a => a.targetRoleId)));

  const [sourceRolePermRows, targetRolePermRows] = await Promise.all([
    allSourceRoleIds.length > 0
      ? db.select({
          sourceRoleId: schema.sourceRolePermissions.sourceRoleId,
          permissionId: schema.sourcePermissions.permissionId,
        })
        .from(schema.sourceRolePermissions)
        .innerJoin(schema.sourcePermissions, eq(schema.sourceRolePermissions.sourcePermissionId, schema.sourcePermissions.id))
        .where(inArray(schema.sourceRolePermissions.sourceRoleId, allSourceRoleIds))
      : Promise.resolve([]),
    allTargetRoleIds.length > 0
      ? db.select({
          targetRoleId: schema.targetRolePermissions.targetRoleId,
          permissionId: schema.targetPermissions.permissionId,
        })
        .from(schema.targetRolePermissions)
        .innerJoin(schema.targetPermissions, eq(schema.targetRolePermissions.targetPermissionId, schema.targetPermissions.id))
        .where(inArray(schema.targetRolePermissions.targetRoleId, allTargetRoleIds))
      : Promise.resolve([]),
  ]);

  // Build: sourceRoleId → Set<permissionId>
  const sourceRolePermMap = new Map<number, Set<string>>();
  for (const r of sourceRolePermRows) {
    if (!sourceRolePermMap.has(r.sourceRoleId)) sourceRolePermMap.set(r.sourceRoleId, new Set());
    sourceRolePermMap.get(r.sourceRoleId)!.add(r.permissionId);
  }

  // Build: userId → Set<sourcePermissionId>
  const userSourcePerms = new Map<number, Set<string>>();
  for (const a of sourceRoleAssignments) {
    if (!userSourcePerms.has(a.userId)) userSourcePerms.set(a.userId, new Set());
    const perms = sourceRolePermMap.get(a.sourceRoleId);
    if (perms) {
      for (const p of Array.from(perms)) userSourcePerms.get(a.userId)!.add(p);
    }
  }

  const targetRolePermMap = new Map<number, Set<string>>();
  for (const r of targetRolePermRows) {
    if (!targetRolePermMap.has(r.targetRoleId)) targetRolePermMap.set(r.targetRoleId, new Set());
    targetRolePermMap.get(r.targetRoleId)!.add(r.permissionId);
  }

  const userTargetPerms = new Map<number, Set<string>>();
  for (const a of targetRoleAssignments) {
    if (!userTargetPerms.has(a.userId)) userTargetPerms.set(a.userId, new Set());
    const perms = targetRolePermMap.get(a.targetRoleId);
    if (perms) {
      for (const p of Array.from(perms)) userTargetPerms.get(a.userId)!.add(p);
    }
  }

  const userSodCounts = new Map<number, number>();
  for (const r of sodConflictRows) {
    userSodCounts.set(r.userId, r.count);
  }

  // 5. Compute risk metrics per user
  let totalUncoveredPerms = 0;
  let totalNewPerms = 0;
  let usersAtRisk = 0;
  let usersWithNewAccess = 0;
  let totalCoverage = 0;
  let analyzedCount = 0;
  const flaggedUserList: FlaggedUser[] = [];

  for (const user of usersWithAssignments) {
    const source = userSourcePerms.get(user.id) ?? new Set<string>();
    const target = userTargetPerms.get(user.id) ?? new Set<string>();

    // Skip users with no source roles (nothing to compare)
    if (source.size === 0 && target.size === 0) continue;

    analyzedCount++;

    // Uncovered: source perms not in target
    let uncoveredCount = 0;
    for (const p of Array.from(source)) {
      if (!target.has(p)) uncoveredCount++;
    }

    // New: target perms not in source
    let newCount = 0;
    for (const p of Array.from(target)) {
      if (!source.has(p)) newCount++;
    }

    const coveragePercent = source.size > 0
      ? Math.round(((source.size - uncoveredCount) / source.size) * 100)
      : 100;

    totalCoverage += coveragePercent;
    totalUncoveredPerms += uncoveredCount;
    totalNewPerms += newCount;

    if (coveragePercent < 90) usersAtRisk++;
    if (newCount > 10) usersWithNewAccess++;

    // Flagged: both uncovered perms AND SOD conflicts
    const sodCount = userSodCounts.get(user.id) ?? 0;
    if (uncoveredCount > 0 && sodCount > 0) {
      flaggedUserList.push({
        userId: user.id,
        userName: user.displayName,
        department: user.department,
        coveragePercent,
        uncoveredPermCount: uncoveredCount,
        newPermCount: newCount,
        sodConflictCount: sodCount,
      });
    }
  }

  // Sort flagged users by SOD conflict count descending
  flaggedUserList.sort((a, b) => b.sodConflictCount - a.sodConflictCount);

  return {
    businessContinuity: {
      usersAtRisk,
      totalUncoveredPerms,
      avgCoverage: analyzedCount > 0 ? Math.round(totalCoverage / analyzedCount) : 100,
    },
    adoption: {
      usersWithNewAccess,
      totalNewPerms,
    },
    incorrectAccess: {
      flaggedUsers: flaggedUserList.length,
      flaggedUserList,
    },
    totalUsersAnalyzed: analyzedCount,
  };
}
