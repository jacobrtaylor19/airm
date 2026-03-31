import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, sql, eq, and, inArray } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

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

export async function getLeastAccessAnalysis(orgId: number, threshold: number): Promise<LeastAccessRow[]> {
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
    .where(and(sql`${schema.personaTargetRoleMappings.excessPercent} >= ${threshold}`, orgScope(schema.personas.organizationId, orgId)));

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
  orgId: number,
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
      .where(and(inArray(schema.users.id, scopedUserIds), orgScope(schema.users.organizationId, orgId)));
  } else {
    usersWithAssignments = await db
      .select({
        id: schema.users.id,
        displayName: schema.users.displayName,
        department: schema.users.department,
      })
      .from(schema.users)
      .where(orgScope(schema.users.organizationId, orgId));
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

  // Build: sourceRoleId -> Set<permissionId>
  const sourceRolePermMap = new Map<number, Set<string>>();
  for (const r of sourceRolePermRows) {
    if (!sourceRolePermMap.has(r.sourceRoleId)) sourceRolePermMap.set(r.sourceRoleId, new Set());
    sourceRolePermMap.get(r.sourceRoleId)!.add(r.permissionId);
  }

  // Build: userId -> Set<sourcePermissionId>
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
