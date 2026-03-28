import { db } from "@/db";
import * as schema from "@/db/schema";
import { sql, eq } from "drizzle-orm";

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
