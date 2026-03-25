import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, sql, eq, desc, ne, and, inArray } from "drizzle-orm";

export function getDashboardStats() {
  const totalUsers = db.select({ count: count() }).from(schema.users).get()!.count;
  const totalPersonas = db.select({ count: count() }).from(schema.personas).get()!.count;
  const totalSourceRoles = db.select({ count: count() }).from(schema.sourceRoles).get()!.count;
  const totalTargetRoles = db.select({ count: count() }).from(schema.targetRoles).get()!.count;
  const totalGroups = db.select({ count: count() }).from(schema.consolidatedGroups).get()!.count;

  const usersWithPersona = db
    .select({ count: count() })
    .from(schema.userPersonaAssignments)
    .get()!.count;

  const personasWithMapping = db
    .select({ count: sql<number>`count(distinct ${schema.personaTargetRoleMappings.personaId})` })
    .from(schema.personaTargetRoleMappings)
    .get()!.count;

  const totalAssignments = db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .get()!.count;

  const approvedAssignments = db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "approved"))
    .get()!.count;

  const complianceApproved = db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "compliance_approved"))
    .get()!.count;

  const sodRejected = db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "sod_rejected"))
    .get()!.count;

  const readyForApproval = db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "ready_for_approval"))
    .get()!.count;

  const sourcePermissions = db.select({ count: count() }).from(schema.sourcePermissions).get()!.count;
  const rolePermissions = db.select({ count: count() }).from(schema.sourceRolePermissions).get()!.count;
  const sodRulesCount = db.select({ count: count() }).from(schema.sodRules).get()!.count;

  // SOD conflicts by severity
  const sodConflictsBySeverity = db
    .select({
      severity: schema.sodConflicts.severity,
      count: count(),
    })
    .from(schema.sodConflicts)
    .groupBy(schema.sodConflicts.severity)
    .all();

  // Department breakdown
  const departmentStats = db
    .select({
      department: schema.users.department,
      count: count(),
    })
    .from(schema.users)
    .groupBy(schema.users.department)
    .all();

  // Users with persona by department
  const deptPersonaCounts = db
    .select({
      department: schema.users.department,
      count: count(),
    })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.users, eq(schema.userPersonaAssignments.userId, schema.users.id))
    .groupBy(schema.users.department)
    .all();

  // Low confidence assignments
  const lowConfidence = db
    .select({ count: count() })
    .from(schema.userPersonaAssignments)
    .where(sql`${schema.userPersonaAssignments.confidenceScore} < 65`)
    .get()!.count;

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
    sourcePermissions,
    rolePermissions,
    sodRulesCount,
    sodConflictsBySeverity,
    departmentStats,
    deptPersonaCounts,
    lowConfidence,
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

export function getUsers(): UserRow[] {
  return db
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
    )
    .all();
}

export interface UserDetail {
  id: number;
  sourceUserId: string;
  displayName: string;
  email: string | null;
  department: string | null;
  jobTitle: string | null;
  orgUnit: string | null;
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
  }[];
  targetRoleAssignments: {
    id: number;
    targetRoleId: number;
    roleName: string;
    roleId: string;
    status: string;
    assignmentType: string;
    domain: string | null;
  }[];
  sodConflicts: {
    id: number;
    severity: string;
    ruleName: string;
    resolutionStatus: string;
    permissionIdA: string | null;
    permissionIdB: string | null;
  }[];
}

export function getUserDetail(id: number): UserDetail | null {
  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .get();
  if (!user) return null;

  const assignment = db
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
    .where(eq(schema.userPersonaAssignments.userId, id))
    .get();

  const sourceRoles = db
    .select({
      id: schema.sourceRoles.id,
      roleId: schema.sourceRoles.roleId,
      roleName: schema.sourceRoles.roleName,
      domain: schema.sourceRoles.domain,
    })
    .from(schema.userSourceRoleAssignments)
    .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.userSourceRoleAssignments.sourceRoleId))
    .where(eq(schema.userSourceRoleAssignments.userId, id))
    .all();

  const targetRoleAssignments = db
    .select({
      id: schema.userTargetRoleAssignments.id,
      targetRoleId: schema.userTargetRoleAssignments.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleId: schema.targetRoles.roleId,
      status: schema.userTargetRoleAssignments.status,
      assignmentType: schema.userTargetRoleAssignments.assignmentType,
      domain: schema.targetRoles.domain,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .where(eq(schema.userTargetRoleAssignments.userId, id))
    .all();

  const sodConflicts = db
    .select({
      id: schema.sodConflicts.id,
      severity: schema.sodConflicts.severity,
      ruleName: schema.sodRules.ruleName,
      resolutionStatus: schema.sodConflicts.resolutionStatus,
      permissionIdA: schema.sodConflicts.permissionIdA,
      permissionIdB: schema.sodConflicts.permissionIdB,
    })
    .from(schema.sodConflicts)
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .where(eq(schema.sodConflicts.userId, id))
    .all();

  return {
    id: user.id,
    sourceUserId: user.sourceUserId,
    displayName: user.displayName,
    email: user.email,
    department: user.department,
    jobTitle: user.jobTitle,
    orgUnit: user.orgUnit,
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
// PERSONAS
// ─────────────────────────────────────────────

export interface PersonaRow {
  id: number;
  name: string;
  businessFunction: string | null;
  groupName: string | null;
  groupId: number | null;
  source: string;
  userCount: number;
}

export function getPersonas(): PersonaRow[] {
  return db
    .select({
      id: schema.personas.id,
      name: schema.personas.name,
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
    )
    .all();
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
    confidence: string | null;
  }[];
}

export function getPersonaDetail(id: number): PersonaDetail | null {
  const persona = db
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
    .where(eq(schema.personas.id, id))
    .get();

  if (!persona) return null;

  const sourcePermissions = db
    .select({
      id: schema.sourcePermissions.id,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      weight: schema.personaSourcePermissions.weight,
      isRequired: schema.personaSourcePermissions.isRequired,
    })
    .from(schema.personaSourcePermissions)
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.personaSourcePermissions.sourcePermissionId))
    .where(eq(schema.personaSourcePermissions.personaId, id))
    .all();

  const users = db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      department: schema.users.department,
      jobTitle: schema.users.jobTitle,
      confidenceScore: schema.userPersonaAssignments.confidenceScore,
    })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
    .where(eq(schema.userPersonaAssignments.personaId, id))
    .all();

  const targetRoleMappings = db
    .select({
      id: schema.personaTargetRoleMappings.id,
      targetRoleId: schema.personaTargetRoleMappings.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleId: schema.targetRoles.roleId,
      coveragePercent: schema.personaTargetRoleMappings.coveragePercent,
      confidence: schema.personaTargetRoleMappings.confidence,
    })
    .from(schema.personaTargetRoleMappings)
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.personaTargetRoleMappings.targetRoleId))
    .where(eq(schema.personaTargetRoleMappings.personaId, id))
    .all();

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

export function getConsolidatedGroups(): GroupRow[] {
  return db
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
    .from(schema.consolidatedGroups)
    .all();
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
  permissionCount: number;
  userCount: number;
}

export function getSourceRoles(): SourceRoleRow[] {
  return db
    .select({
      id: schema.sourceRoles.id,
      roleId: schema.sourceRoles.roleId,
      roleName: schema.sourceRoles.roleName,
      domain: schema.sourceRoles.domain,
      system: schema.sourceRoles.system,
      permissionCount: sql<number>`(
        SELECT count(*) FROM source_role_permissions srp
        WHERE srp.source_role_id = source_roles.id
      )`,
      userCount: sql<number>`(
        SELECT count(*) FROM user_source_role_assignments usra
        WHERE usra.source_role_id = source_roles.id
      )`,
    })
    .from(schema.sourceRoles)
    .all();
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

export function getSourceRoleDetail(id: number): SourceRoleDetail | null {
  const role = db.select().from(schema.sourceRoles).where(eq(schema.sourceRoles.id, id)).get();
  if (!role) return null;

  const permissions = db
    .select({
      id: schema.sourcePermissions.id,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      permissionType: schema.sourcePermissions.permissionType,
      riskLevel: schema.sourcePermissions.riskLevel,
    })
    .from(schema.sourceRolePermissions)
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.sourceRolePermissions.sourcePermissionId))
    .where(eq(schema.sourceRolePermissions.sourceRoleId, id))
    .all();

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
  permissionCount: number;
}

export function getTargetRoles(): TargetRoleRow[] {
  return db
    .select({
      id: schema.targetRoles.id,
      roleId: schema.targetRoles.roleId,
      roleName: schema.targetRoles.roleName,
      description: schema.targetRoles.description,
      domain: schema.targetRoles.domain,
      system: schema.targetRoles.system,
      permissionCount: sql<number>`(
        SELECT count(*) FROM target_role_permissions trp
        WHERE trp.target_role_id = target_roles.id
      )`,
    })
    .from(schema.targetRoles)
    .all();
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
}

export function getSodRules(): SodRuleRow[] {
  return db.select().from(schema.sodRules).all();
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
  ruleName: string;
  ruleDescription: string | null;
  permissionIdA: string | null;
  permissionIdB: string | null;
  roleIdA: number | null;
  roleIdB: number | null;
  roleNameA: string | null;
  roleNameB: string | null;
  resolutionStatus: string;
  resolvedBy: string | null;
  resolutionNotes: string | null;
}

export function getSodConflicts(): SodConflictRow[] {
  const conflicts = db
    .select({
      id: schema.sodConflicts.id,
      userId: schema.sodConflicts.userId,
      userName: schema.users.displayName,
      department: schema.users.department,
      severity: schema.sodConflicts.severity,
      ruleName: schema.sodRules.ruleName,
      ruleDescription: schema.sodRules.riskDescription,
      permissionIdA: schema.sodConflicts.permissionIdA,
      permissionIdB: schema.sodConflicts.permissionIdB,
      roleIdA: schema.sodConflicts.roleIdA,
      roleIdB: schema.sodConflicts.roleIdB,
      resolutionStatus: schema.sodConflicts.resolutionStatus,
      resolvedBy: schema.sodConflicts.resolvedBy,
      resolutionNotes: schema.sodConflicts.resolutionNotes,
    })
    .from(schema.sodConflicts)
    .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .all();

  // Resolve role names manually (roleB can't use Drizzle relation)
  return conflicts.map((c) => {
    const roleA = c.roleIdA
      ? db.select({ roleName: schema.targetRoles.roleName }).from(schema.targetRoles).where(eq(schema.targetRoles.id, c.roleIdA)).get()
      : null;
    const roleB = c.roleIdB
      ? db.select({ roleName: schema.targetRoles.roleName }).from(schema.targetRoles).where(eq(schema.targetRoles.id, c.roleIdB)).get()
      : null;
    return {
      id: c.id,
      userId: c.userId,
      userName: c.userName,
      department: c.department,
      severity: c.severity,
      ruleName: c.ruleName,
      ruleDescription: c.ruleDescription,
      permissionIdA: c.permissionIdA,
      permissionIdB: c.permissionIdB,
      roleIdA: c.roleIdA,
      roleIdB: c.roleIdB,
      roleNameA: roleA?.roleName ?? null,
      roleNameB: roleB?.roleName ?? null,
      resolutionStatus: c.resolutionStatus,
      resolvedBy: c.resolvedBy,
      resolutionNotes: c.resolutionNotes,
    };
  });
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

export function getApprovalQueue(): ApprovalRow[] {
  return db
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
    .leftJoin(schema.personas, eq(schema.personas.id, schema.userTargetRoleAssignments.derivedFromPersonaId))
    .all();
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

export function getJobs(): JobRow[] {
  return db
    .select()
    .from(schema.processingJobs)
    .orderBy(desc(schema.processingJobs.createdAt))
    .all();
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

export function getAuditLog(): AuditLogRow[] {
  return db
    .select()
    .from(schema.auditLog)
    .orderBy(desc(schema.auditLog.createdAt))
    .all();
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

export function getPersonaMappingWorkspace(): PersonaMappingRow[] {
  return db
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
    .leftJoin(schema.consolidatedGroups, eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId))
    .all();
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

export function getUserRefinements(): UserRefinementRow[] {
  return db
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
    .where(ne(schema.userTargetRoleAssignments.assignmentType, "persona_default"))
    .all();
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

export function getGapAnalysis(): GapRow[] {
  return db
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
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.permissionGaps.sourcePermissionId))
    .all();
}

// ─────────────────────────────────────────────
// DEPARTMENT MAPPING STATUS
// ─────────────────────────────────────────────

export interface DepartmentMappingStatus {
  department: string;
  totalUsers: number;
  withPersona: number;
  mapped: number;
  sodClean: number;
  approved: number;
}

export function getDepartmentMappingStatus(): DepartmentMappingStatus[] {
  const departments = db.select({
    department: schema.users.department,
    totalUsers: count(),
  }).from(schema.users).groupBy(schema.users.department).all();

  return departments.map((d) => {
    const dept = d.department || "Unknown";

    const withPersona = db.select({ count: count() })
      .from(schema.userPersonaAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
      .where(eq(schema.users.department, dept))
      .get()!.count;

    // Users who have at least one target role assignment
    const mapped = db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(eq(schema.users.department, dept))
      .get()!.count;

    // Users whose ALL assignments are compliance_approved or sod_risk_accepted or approved
    const sodClean = db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(sql`users.department = ${dept} AND user_target_role_assignments.status IN ('compliance_approved', 'sod_risk_accepted', 'ready_for_approval', 'approved')`)
      .get()!.count;

    const approved = db.select({
      count: sql<number>`count(distinct user_target_role_assignments.user_id)`,
    })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(sql`users.department = ${dept} AND user_target_role_assignments.status = 'approved'`)
      .get()!.count;

    return { department: dept, totalUsers: d.totalUsers, withPersona, mapped, sodClean, approved };
  });
}

// ─────────────────────────────────────────────
// WORK ASSIGNMENTS (scope filtering)
// ─────────────────────────────────────────────

export function getAssignedScope(appUserId: number, assignmentType: string): { departments: string[]; userIds: string[] } {
  const assignments = db.select().from(schema.workAssignments)
    .where(and(
      eq(schema.workAssignments.appUserId, appUserId),
      eq(schema.workAssignments.assignmentType, assignmentType)
    ))
    .all();

  const departments: string[] = [];
  const userIds: string[] = [];

  for (const a of assignments) {
    if (a.scopeType === "department") departments.push(a.scopeValue);
    else if (a.scopeType === "user") userIds.push(a.scopeValue);
  }

  return { departments, userIds };
}

export function getSourceUserIdsInScope(scope: { departments: string[]; userIds: string[] }): number[] {
  const ids = new Set<number>();

  if (scope.departments.length > 0) {
    const users = db.select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.department, scope.departments))
      .all();
    for (const u of users) ids.add(u.id);
  }

  if (scope.userIds.length > 0) {
    const users = db.select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.sourceUserId, scope.userIds))
      .all();
    for (const u of users) ids.add(u.id);
  }

  return Array.from(ids);
}

export function getApprovalQueueScoped(appUserId: number): ApprovalRow[] {
  const scope = getAssignedScope(appUserId, "approver");
  const all = getApprovalQueue();

  // If no assignments, return empty (not everything)
  if (scope.departments.length === 0 && scope.userIds.length === 0) return [];

  const scopedUserIds = getSourceUserIdsInScope(scope);
  const idSet = new Set(scopedUserIds);
  return all.filter((a) => idSet.has(a.userId));
}

export function getUsersScoped(appUserId: number, assignmentType: string): UserRow[] {
  const scope = getAssignedScope(appUserId, assignmentType);
  const all = getUsers();

  if (scope.departments.length === 0 && scope.userIds.length === 0) return [];

  const scopedUserIds = getSourceUserIdsInScope(scope);
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

export function getOpenSodConflictsByPersona(): Map<number, PersonaSodConflict[]> {
  // Get all open SOD conflicts with user-persona info
  const rows = db
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
    .where(eq(schema.sodConflicts.resolutionStatus, "open"))
    .all();

  const result = new Map<number, PersonaSodConflict[]>();
  for (const r of rows) {
    if (!r.personaId) continue;
    const roleA = r.roleIdA
      ? db.select({ roleName: schema.targetRoles.roleName }).from(schema.targetRoles).where(eq(schema.targetRoles.id, r.roleIdA)).get()
      : null;
    const roleB = r.roleIdB
      ? db.select({ roleName: schema.targetRoles.roleName }).from(schema.targetRoles).where(eq(schema.targetRoles.id, r.roleIdB)).get()
      : null;
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

export function getPersonaIdsForUsers(userIds: number[]): number[] {
  if (userIds.length === 0) return [];
  const idSet = new Set(userIds);
  const assignments = db.select({
    personaId: schema.userPersonaAssignments.personaId,
    userId: schema.userPersonaAssignments.userId,
  }).from(schema.userPersonaAssignments).all();

  const personaIds = new Set<number>();
  for (const a of assignments) {
    if (a.personaId && idSet.has(a.userId)) personaIds.add(a.personaId);
  }
  return Array.from(personaIds);
}
