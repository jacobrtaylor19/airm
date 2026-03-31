import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

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

export async function getSodRules(orgId: number): Promise<SodRuleRow[]> {
  return await db.select().from(schema.sodRules).where(orgScope(schema.sodRules.organizationId, orgId));
}

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

export async function getSodConflicts(orgId: number): Promise<SodConflictRow[]> {
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
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .where(orgScope(schema.users.organizationId, orgId));

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

export async function getSodConflictsDetailed(orgId: number): Promise<SodConflictDetailed[]> {
  const base = await getSodConflicts(orgId);

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

export async function getSodConflictDetail(orgId: number, conflictId: number): Promise<SodConflictDetailed | null> {
  const all = await getSodConflictsDetailed(orgId);
  return all.find(c => c.id === conflictId) ?? null;
}

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

export async function getOpenSodConflictsByPersona(orgId: number): Promise<Map<number, PersonaSodConflict[]>> {
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
    .where(and(eq(schema.sodConflicts.resolutionStatus, "open"), orgScope(schema.users.organizationId, orgId)));

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
