import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";

interface SodAnalysisResult {
  usersAnalyzed: number;
  conflictsFound: number;
  usersWithConflicts: number;
  usersClean: number;
}

export function runSodAnalysis(): SodAnalysisResult {
  // 1. Load all active SOD rules
  const rules = db.select().from(schema.sodRules).where(eq(schema.sodRules.isActive, true)).all();

  if (rules.length === 0) {
    // No SOD rules — mark all draft assignments as compliance_approved
    db.update(schema.userTargetRoleAssignments)
      .set({ status: "compliance_approved", updatedAt: new Date().toISOString() })
      .where(eq(schema.userTargetRoleAssignments.status, "draft"))
      .run();

    const totalDraft = db.select().from(schema.userTargetRoleAssignments).all();
    return {
      usersAnalyzed: new Set(totalDraft.map(a => a.userId)).size,
      conflictsFound: 0,
      usersWithConflicts: 0,
      usersClean: new Set(totalDraft.map(a => a.userId)).size,
    };
  }

  // 2. Load all user target role assignments in draft status
  const assignments = db.select().from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "draft"))
    .all();

  // 3. Group assignments by user
  const userAssignments = new Map<number, number[]>();
  for (const a of assignments) {
    if (!userAssignments.has(a.userId)) userAssignments.set(a.userId, []);
    userAssignments.get(a.userId)!.push(a.targetRoleId);
  }

  // 4. For each target role, expand to its permissions
  const rolePerms = new Map<number, Set<string>>();
  const trps = db.select({
    roleId: schema.targetRolePermissions.targetRoleId,
    permissionId: schema.targetPermissions.permissionId,
  }).from(schema.targetRolePermissions)
    .innerJoin(schema.targetPermissions, eq(schema.targetRolePermissions.targetPermissionId, schema.targetPermissions.id))
    .all();

  for (const row of trps) {
    if (!rolePerms.has(row.roleId)) rolePerms.set(row.roleId, new Set());
    rolePerms.get(row.roleId)!.add(row.permissionId);
  }

  // 5. Clear previous conflicts
  db.delete(schema.sodConflicts).run();

  // 6. For each user, check all SOD rules
  let conflictsFound = 0;
  const usersWithConflictsSet = new Set<number>();

  const userEntries = Array.from(userAssignments.entries());
  for (const entry of userEntries) {
    const userId = entry[0];
    const roleIds = entry[1];
    // Compile user's full permission set
    const userPerms = new Set<string>();
    const permToRole = new Map<string, number>();
    for (const roleId of roleIds) {
      const perms = rolePerms.get(roleId) || new Set();
      const permArr = Array.from(perms);
      for (const p of permArr) {
        userPerms.add(p);
        permToRole.set(p, roleId);
      }
    }

    // Check each SOD rule
    let userConflictCount = 0;
    for (const rule of rules) {
      if (userPerms.has(rule.permissionA) && userPerms.has(rule.permissionB)) {
        conflictsFound++;
        userConflictCount++;
        usersWithConflictsSet.add(userId);

        db.insert(schema.sodConflicts).values({
          userId,
          sodRuleId: rule.id,
          roleIdA: permToRole.get(rule.permissionA) ?? null,
          roleIdB: permToRole.get(rule.permissionB) ?? null,
          permissionIdA: rule.permissionA,
          permissionIdB: rule.permissionB,
          severity: rule.severity,
          resolutionStatus: "open",
        }).run();
      }
    }

    // Update assignment statuses for this user
    const newStatus = userConflictCount > 0 ? "sod_rejected" : "compliance_approved";
    for (const roleId of roleIds) {
      db.update(schema.userTargetRoleAssignments)
        .set({
          status: newStatus,
          sodConflictCount: userConflictCount,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(schema.userTargetRoleAssignments.userId, userId),
            eq(schema.userTargetRoleAssignments.targetRoleId, roleId),
            eq(schema.userTargetRoleAssignments.status, "draft")
          )
        )
        .run();
    }
  }

  return {
    usersAnalyzed: userAssignments.size,
    conflictsFound,
    usersWithConflicts: usersWithConflictsSet.size,
    usersClean: userAssignments.size - usersWithConflictsSet.size,
  };
}
