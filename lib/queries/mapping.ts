import { db } from "@/db";
import * as schema from "@/db/schema";
import { sql, eq, ne, and } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

export interface PersonaMappingRow {
  personaId: number;
  personaName: string;
  groupName: string | null;
  userCount: number;
  mappedRoleCount: number;
  sourcePermissionCount: number;
}

export async function getPersonaMappingWorkspace(orgId: number): Promise<PersonaMappingRow[]> {
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
    .leftJoin(schema.consolidatedGroups, eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId))
    .where(orgScope(schema.personas.organizationId, orgId));
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

export async function getUserRefinements(orgId: number): Promise<UserRefinementRow[]> {
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
    .where(and(ne(schema.userTargetRoleAssignments.assignmentType, "persona_default"), orgScope(schema.users.organizationId, orgId)));
}

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
export async function getUserRefinementDetails(orgId: number): Promise<UserRefinementDetail[]> {
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
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .where(orgScope(schema.users.organizationId, orgId));

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

export interface GapRow {
  gapId: number;
  personaId: number;
  personaName: string;
  permissionId: string;
  permissionName: string | null;
  gapType: string;
  notes: string | null;
}

export async function getGapAnalysis(orgId: number): Promise<GapRow[]> {
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
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.permissionGaps.sourcePermissionId))
    .where(orgScope(schema.personas.organizationId, orgId));
}

export interface UserGapAnalysis {
  sourcePermissions: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[];
  targetPermissions: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[];
  uncoveredPermissions: { permissionId: string; permissionName: string | null; system: string | null; sourceRoles: string[] }[];
  newPermissions: { permissionId: string; permissionName: string | null; system: string | null; targetRoles: string[] }[];
  coveragePercent: number;
}

export async function getUserGapAnalysis(userId: number): Promise<UserGapAnalysis> {
  // Get user's source permissions (via source role assignments -> source roles -> source role permissions)
  const sourceRoleAssignments = await db
    .select({
      roleId: schema.sourceRoles.id,
      roleName: schema.sourceRoles.roleName,
    })
    .from(schema.userSourceRoleAssignments)
    .innerJoin(schema.sourceRoles, eq(schema.userSourceRoleAssignments.sourceRoleId, schema.sourceRoles.id))
    .where(eq(schema.userSourceRoleAssignments.userId, userId));

  const sourcePerms: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[] = [];
  const sourcePermMap = new Map<string, string[]>(); // permId -> roleNames

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

  // Get user's target permissions (via target role assignments -> target roles -> target role permissions)
  const targetRoleAssignments = await db
    .select({
      roleId: schema.targetRoles.id,
      roleName: schema.targetRoles.roleName,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.targetRoles, eq(schema.userTargetRoleAssignments.targetRoleId, schema.targetRoles.id))
    .where(eq(schema.userTargetRoleAssignments.userId, userId));

  const targetPerms: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[] = [];
  const targetPermMap = new Map<string, string[]>(); // permId -> roleNames

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
export async function getGapAnalysisSummary(orgId: number): Promise<GapAnalysisSummary> {
  const allPersonaPerms = await db
    .select({
      personaId: schema.personaSourcePermissions.personaId,
      sourcePermissionId: schema.personaSourcePermissions.sourcePermissionId,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      description: schema.sourcePermissions.description,
    })
    .from(schema.personaSourcePermissions)
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.personaSourcePermissions.sourcePermissionId))
    .innerJoin(schema.personas, eq(schema.personas.id, schema.personaSourcePermissions.personaId))
    .where(orgScope(schema.personas.organizationId, orgId));

  const personas = await db
    .select({ id: schema.personas.id, name: schema.personas.name })
    .from(schema.personas)
    .where(orgScope(schema.personas.organizationId, orgId));

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
