import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSetting } from "@/lib/settings";

interface SodAnalysisResult {
  usersAnalyzed: number;
  conflictsFound: number;
  usersWithConflicts: number;
  usersClean: number;
}

export function runSodAnalysis(scopedUserIds?: number[] | null): SodAnalysisResult {
  // 1. Load all active SOD rules
  const rules = db.select().from(schema.sodRules).where(eq(schema.sodRules.isActive, true)).all();

  if (rules.length === 0) {
    // No SOD rules — mark all pending_review assignments as compliance_approved
    db.update(schema.userTargetRoleAssignments)
      .set({ status: "compliance_approved", updatedAt: new Date().toISOString() })
      .where(eq(schema.userTargetRoleAssignments.status, "pending_review"))
      .run();

    const totalDraft = db.select().from(schema.userTargetRoleAssignments).all();
    return {
      usersAnalyzed: new Set(totalDraft.map(a => a.userId)).size,
      conflictsFound: 0,
      usersWithConflicts: 0,
      usersClean: new Set(totalDraft.map(a => a.userId)).size,
    };
  }

  // 2. Load user target role assignments — both "current" (pending_review) and "existing" (approved from previous waves)
  //    SOD must check the complete picture: existing + current together
  //    Scope-filtered when called by a scoped user (mapper/approver)
  const draftAssignments = scopedUserIds
    ? db.select().from(schema.userTargetRoleAssignments)
        .where(and(eq(schema.userTargetRoleAssignments.status, "pending_review"), inArray(schema.userTargetRoleAssignments.userId, scopedUserIds)))
        .all()
    : db.select().from(schema.userTargetRoleAssignments)
        .where(eq(schema.userTargetRoleAssignments.status, "pending_review"))
        .all();

  const existingAssignments = scopedUserIds
    ? db.select().from(schema.userTargetRoleAssignments)
        .where(and(eq(schema.userTargetRoleAssignments.releasePhase, "existing"), inArray(schema.userTargetRoleAssignments.userId, scopedUserIds)))
        .all()
    : db.select().from(schema.userTargetRoleAssignments)
        .where(eq(schema.userTargetRoleAssignments.releasePhase, "existing"))
        .all();

  // 3. Group ALL assignments by user (both existing and current draft)
  const userAllRoles = new Map<number, Set<number>>();
  const userDraftRoles = new Map<number, number[]>();

  // Add draft assignments
  for (const a of draftAssignments) {
    if (!userAllRoles.has(a.userId)) userAllRoles.set(a.userId, new Set());
    userAllRoles.get(a.userId)!.add(a.targetRoleId);
    if (!userDraftRoles.has(a.userId)) userDraftRoles.set(a.userId, []);
    userDraftRoles.get(a.userId)!.push(a.targetRoleId);
  }

  // Add existing assignments (for SOD checking, but we won't change their status)
  for (const a of existingAssignments) {
    if (!userAllRoles.has(a.userId)) userAllRoles.set(a.userId, new Set());
    userAllRoles.get(a.userId)!.add(a.targetRoleId);
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

  // 6. For each user with draft assignments, check all SOD rules against their FULL role set
  let conflictsFound = 0;
  const usersWithConflictsSet = new Set<number>();

  // Only analyze users who have draft assignments (they're being mapped in current wave)
  const userEntries = Array.from(userDraftRoles.entries());
  for (const [userId, draftRoleIds] of userEntries) {
    // Get ALL roles for this user (existing + current)
    const allRoleIds = Array.from(userAllRoles.get(userId) || new Set<number>());

    // Compile user's full permission set from ALL roles
    const userPerms = new Set<string>();
    const permToRole = new Map<string, number>();
    for (const roleId of allRoleIds) {
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

        const roleIdA = permToRole.get(rule.permissionA) ?? null;
        const roleIdB = permToRole.get(rule.permissionB) ?? null;
        // Determine conflict type: if both permissions come from the same role, it's within_role
        const conflictType = (roleIdA !== null && roleIdB !== null && roleIdA === roleIdB)
          ? "within_role"
          : "between_role";

        db.insert(schema.sodConflicts).values({
          userId,
          sodRuleId: rule.id,
          roleIdA,
          roleIdB,
          permissionIdA: rule.permissionA,
          permissionIdB: rule.permissionB,
          severity: rule.severity,
          conflictType,
          resolutionStatus: "open",
        }).run();
      }
    }

    // Update assignment statuses for this user's DRAFT assignments only
    // (existing/approved assignments keep their status)
    const newStatus = userConflictCount > 0 ? "sod_rejected" : "compliance_approved";
    for (const roleId of draftRoleIds) {
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
            eq(schema.userTargetRoleAssignments.status, "pending_review")
          )
        )
        .run();
    }
  }

  // Auto-recommend: route SOD-clean high-confidence assignments to approver for bulk review
  // (does NOT skip the approver — sets status to "ready_for_approval" so approver can confirm in bulk)
  const autoApprove = getSetting("workflow.autoApprove") === "true";
  if (autoApprove) {
    const confidenceThreshold = Number(getSetting("ai.confidenceThreshold") || "85");

    // Get all compliance_approved assignments (SOD-clean, just set above)
    const cleanAssignments = db
      .select()
      .from(schema.userTargetRoleAssignments)
      .where(eq(schema.userTargetRoleAssignments.status, "compliance_approved"))
      .all();

    // Group by user and check their persona assignment confidence
    const userIds = Array.from(new Set(cleanAssignments.map((a) => a.userId)));
    for (const userId of userIds) {
      const personaAssignment = db
        .select()
        .from(schema.userPersonaAssignments)
        .where(eq(schema.userPersonaAssignments.userId, userId))
        .get();

      const confidence = personaAssignment?.confidenceScore ?? 0;
      if (confidence >= confidenceThreshold) {
        // Route to approver: compliance_approved -> ready_for_approval
        // Approver still needs to review and confirm — this just pre-qualifies them
        db.update(schema.userTargetRoleAssignments)
          .set({
            status: "ready_for_approval",
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(schema.userTargetRoleAssignments.userId, userId),
              eq(schema.userTargetRoleAssignments.status, "compliance_approved")
            )
          )
          .run();
      }
    }
  }

  return {
    usersAnalyzed: userDraftRoles.size,
    conflictsFound,
    usersWithConflicts: usersWithConflictsSet.size,
    usersClean: userDraftRoles.size - usersWithConflictsSet.size,
  };
}
