import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
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
  mitigatingControl: string | null;
  controlOwner: string | null;
  controlFrequency: string | null;
  involvedExistingAccess: boolean;
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
      mitigatingControl: schema.sodConflicts.mitigatingControl,
      controlOwner: schema.sodConflicts.controlOwner,
      controlFrequency: schema.sodConflicts.controlFrequency,
      involvedExistingAccess: schema.sodConflicts.involvedExistingAccess,
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
      mitigatingControl: c.mitigatingControl,
      controlOwner: c.controlOwner,
      controlFrequency: c.controlFrequency,
      involvedExistingAccess: c.involvedExistingAccess,
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

// --- Within-Role SOD Intelligence ---

export interface WithinRoleViolation {
  roleId: number;
  roleName: string;
  roleCode: string;
  violationCount: number;
  affectedUserCount: number;
  worstSeverity: string;
  rules: {
    ruleId: number;
    ruleName: string;
    permissionA: string;
    permissionNameA: string | null;
    permissionB: string;
    permissionNameB: string | null;
    severity: string;
  }[];
}

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

export async function getWithinRoleViolations(orgId: number): Promise<WithinRoleViolation[]> {
  // Get all within_role conflicts with role and rule info
  const rows = await db
    .select({
      conflictId: schema.sodConflicts.id,
      roleIdA: schema.sodConflicts.roleIdA,
      userId: schema.sodConflicts.userId,
      severity: schema.sodConflicts.severity,
      ruleId: schema.sodRules.id,
      ruleName: schema.sodRules.ruleName,
      permissionA: schema.sodConflicts.permissionIdA,
      permissionB: schema.sodConflicts.permissionIdB,
    })
    .from(schema.sodConflicts)
    .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .where(and(
      eq(schema.sodConflicts.conflictType, "within_role"),
      orgScope(schema.users.organizationId, orgId),
    ));

  if (rows.length === 0) return [];

  // Group by roleIdA (for within_role, roleIdA === roleIdB)
  const roleMap = new Map<number, {
    conflictIds: Set<number>;
    userIds: Set<number>;
    rules: Map<number, { ruleId: number; ruleName: string; permissionA: string; permissionB: string; severity: string }>;
    worstSeverityIdx: number;
  }>();

  for (const r of rows) {
    if (r.roleIdA == null) continue;
    let entry = roleMap.get(r.roleIdA);
    if (!entry) {
      entry = { conflictIds: new Set(), userIds: new Set(), rules: new Map(), worstSeverityIdx: SEVERITY_ORDER.length };
      roleMap.set(r.roleIdA, entry);
    }
    entry.conflictIds.add(r.conflictId);
    entry.userIds.add(r.userId);
    if (!entry.rules.has(r.ruleId)) {
      entry.rules.set(r.ruleId, {
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        permissionA: r.permissionA ?? "",
        permissionB: r.permissionB ?? "",
        severity: r.severity,
      });
    }
    const sevIdx = SEVERITY_ORDER.indexOf(r.severity);
    if (sevIdx >= 0 && sevIdx < entry.worstSeverityIdx) {
      entry.worstSeverityIdx = sevIdx;
    }
  }

  // Fetch role names and permission names
  const roleIds = Array.from(roleMap.keys());
  const roleRows = await db
    .select({ id: schema.targetRoles.id, roleName: schema.targetRoles.roleName, roleId: schema.targetRoles.roleId })
    .from(schema.targetRoles)
    .where(inArray(schema.targetRoles.id, roleIds));
  const roleInfoMap = new Map(roleRows.map(r => [r.id, r]));

  // Collect all permission IDs for name resolution
  const allPermIds = new Set<string>();
  for (const entry of Array.from(roleMap.values())) {
    for (const rule of Array.from(entry.rules.values())) {
      if (rule.permissionA) allPermIds.add(rule.permissionA);
      if (rule.permissionB) allPermIds.add(rule.permissionB);
    }
  }
  const permIdArr = Array.from(allPermIds);
  const permNameMap = new Map<string, string | null>();
  if (permIdArr.length > 0) {
    const permRows = await db
      .select({ permissionId: schema.targetPermissions.permissionId, permissionName: schema.targetPermissions.permissionName })
      .from(schema.targetPermissions)
      .where(inArray(schema.targetPermissions.permissionId, permIdArr));
    for (const p of permRows) {
      permNameMap.set(p.permissionId, p.permissionName);
    }
  }

  // Build result
  const violations: WithinRoleViolation[] = [];
  for (const [roleId, entry] of Array.from(roleMap.entries())) {
    const roleInfo = roleInfoMap.get(roleId);
    violations.push({
      roleId,
      roleName: roleInfo?.roleName ?? `Role ${roleId}`,
      roleCode: roleInfo?.roleId ?? "",
      violationCount: entry.rules.size,
      affectedUserCount: entry.userIds.size,
      worstSeverity: SEVERITY_ORDER[entry.worstSeverityIdx] ?? "medium",
      rules: Array.from(entry.rules.values()).map((rule) => ({
        ...rule,
        permissionNameA: permNameMap.get(rule.permissionA) ?? null,
        permissionNameB: permNameMap.get(rule.permissionB) ?? null,
      })),
    });
  }

  // Sort: worst severity first, then affected user count descending
  violations.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER.indexOf(a.worstSeverity) - SEVERITY_ORDER.indexOf(b.worstSeverity);
    if (sevDiff !== 0) return sevDiff;
    return b.affectedUserCount - a.affectedUserCount;
  });

  return violations;
}
