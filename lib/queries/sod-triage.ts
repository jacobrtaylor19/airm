import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

// ── Types ─────────────────────────────────────────────────────────

export interface ComplianceQueueItem {
  conflictId: number;
  roleId: number;
  roleName: string;
  roleCode: string;
  ruleId: number;
  ruleName: string;
  permissionA: string;
  permissionB: string;
  severity: string;
  affectedUserCount: number;
  resolutionStatus: string;
}

export interface SecurityWorkItemDetail {
  id: number;
  sodConflictId: number;
  targetRoleId: number;
  roleName: string;
  roleCode: string;
  status: string;
  complianceNotes: string | null;
  securityNotes: string | null;
  createdByUserName: string;
  assignedToUserName: string | null;
  permissionA: string;
  permissionB: string;
  ruleName: string;
  severity: string;
  affectedUserCount: number;
  completedAt: string | null;
  createdAt: string;
}

// ── Compliance Workspace Queries ──────────────────────────────────

/**
 * Returns within-role conflicts in open/compliance_review status
 * for the compliance officer's active queue.
 */
export async function getComplianceQueue(orgId: number): Promise<ComplianceQueueItem[]> {
  const rows = await db
    .select({
      conflictId: schema.sodConflicts.id,
      roleIdA: schema.sodConflicts.roleIdA,
      userId: schema.sodConflicts.userId,
      severity: schema.sodConflicts.severity,
      resolutionStatus: schema.sodConflicts.resolutionStatus,
      ruleId: schema.sodRules.id,
      ruleName: schema.sodRules.ruleName,
      permissionA: schema.sodRules.permissionA,
      permissionB: schema.sodRules.permissionB,
      roleName: schema.targetRoles.roleName,
      roleCode: schema.targetRoles.roleId,
      targetRoleId: schema.targetRoles.id,
    })
    .from(schema.sodConflicts)
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.sodConflicts.roleIdA))
    .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
    .where(
      and(
        eq(schema.sodConflicts.conflictType, "within_role"),
        inArray(schema.sodConflicts.resolutionStatus, ["open", "compliance_review"]),
        orgScope(schema.users.organizationId, orgId)
      )
    );

  // Group by conflict to get affected user count
  const conflictMap = new Map<number, ComplianceQueueItem>();
  const userCounts = new Map<number, Set<number>>();

  for (const row of rows) {
    if (!userCounts.has(row.conflictId)) {
      userCounts.set(row.conflictId, new Set());
    }
    userCounts.get(row.conflictId)!.add(row.userId);

    if (!conflictMap.has(row.conflictId)) {
      conflictMap.set(row.conflictId, {
        conflictId: row.conflictId,
        roleId: row.targetRoleId,
        roleName: row.roleName,
        roleCode: row.roleCode,
        ruleId: row.ruleId,
        ruleName: row.ruleName,
        permissionA: row.permissionA,
        permissionB: row.permissionB,
        severity: row.severity,
        affectedUserCount: 0,
        resolutionStatus: row.resolutionStatus ?? "open",
      });
    }
  }

  for (const [conflictId, users] of Array.from(userCounts.entries())) {
    const item = conflictMap.get(conflictId);
    if (item) item.affectedUserCount = users.size;
  }

  const SEVERITY_ORDER = ["critical", "high", "medium", "low"];
  return Array.from(conflictMap.values()).sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );
}

/**
 * Returns compliance history — resolved items.
 */
export async function getComplianceHistory(orgId: number): Promise<ComplianceQueueItem[]> {
  const rows = await db
    .select({
      conflictId: schema.sodConflicts.id,
      roleIdA: schema.sodConflicts.roleIdA,
      userId: schema.sodConflicts.userId,
      severity: schema.sodConflicts.severity,
      resolutionStatus: schema.sodConflicts.resolutionStatus,
      ruleId: schema.sodRules.id,
      ruleName: schema.sodRules.ruleName,
      permissionA: schema.sodRules.permissionA,
      permissionB: schema.sodRules.permissionB,
      roleName: schema.targetRoles.roleName,
      roleCode: schema.targetRoles.roleId,
      targetRoleId: schema.targetRoles.id,
    })
    .from(schema.sodConflicts)
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.sodConflicts.roleIdA))
    .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
    .where(
      and(
        eq(schema.sodConflicts.conflictType, "within_role"),
        inArray(schema.sodConflicts.resolutionStatus, [
          "ruleset_updated", "redesign_complete", "risk_accepted", "resolved",
        ]),
        orgScope(schema.users.organizationId, orgId)
      )
    );

  const conflictMap = new Map<number, ComplianceQueueItem>();
  for (const row of rows) {
    if (!conflictMap.has(row.conflictId)) {
      conflictMap.set(row.conflictId, {
        conflictId: row.conflictId,
        roleId: row.targetRoleId,
        roleName: row.roleName,
        roleCode: row.roleCode,
        ruleId: row.ruleId,
        ruleName: row.ruleName,
        permissionA: row.permissionA,
        permissionB: row.permissionB,
        severity: row.severity,
        affectedUserCount: 0,
        resolutionStatus: row.resolutionStatus ?? "resolved",
      });
    }
  }

  return Array.from(conflictMap.values());
}

// ── Security Workspace Queries ────────────────────────────────────

/**
 * Returns all security work items for this org with full detail.
 */
export async function getSecurityWorkItems(orgId: number): Promise<SecurityWorkItemDetail[]> {
  const items = await db
    .select({
      id: schema.securityWorkItems.id,
      sodConflictId: schema.securityWorkItems.sodConflictId,
      targetRoleId: schema.securityWorkItems.targetRoleId,
      status: schema.securityWorkItems.status,
      complianceNotes: schema.securityWorkItems.complianceNotes,
      securityNotes: schema.securityWorkItems.securityNotes,
      completedAt: schema.securityWorkItems.completedAt,
      createdAt: schema.securityWorkItems.createdAt,
    })
    .from(schema.securityWorkItems)
    .where(eq(schema.securityWorkItems.organizationId, orgId));

  if (items.length === 0) return [];

  // Get associated details
  const results: SecurityWorkItemDetail[] = [];
  for (const item of items) {
    // Get conflict details
    const [conflict] = await db
      .select({
        severity: schema.sodConflicts.severity,
        ruleId: schema.sodConflicts.sodRuleId,
        userId: schema.sodConflicts.userId,
      })
      .from(schema.sodConflicts)
      .where(eq(schema.sodConflicts.id, item.sodConflictId));

    // Get role details
    const [role] = await db
      .select({
        roleName: schema.targetRoles.roleName,
        roleCode: schema.targetRoles.roleId,
      })
      .from(schema.targetRoles)
      .where(eq(schema.targetRoles.id, item.targetRoleId));

    // Get rule details
    let ruleName = "Unknown";
    let permissionA = "";
    let permissionB = "";
    if (conflict?.ruleId) {
      const [rule] = await db
        .select({
          ruleName: schema.sodRules.ruleName,
          permissionA: schema.sodRules.permissionA,
          permissionB: schema.sodRules.permissionB,
        })
        .from(schema.sodRules)
        .where(eq(schema.sodRules.id, conflict.ruleId));
      if (rule) {
        ruleName = rule.ruleName;
        permissionA = rule.permissionA;
        permissionB = rule.permissionB;
      }
    }

    // Get created-by and assigned-to user IDs
    const [fullItem] = await db
      .select({
        createdByUserId: schema.securityWorkItems.createdByUserId,
        assignedToUserId: schema.securityWorkItems.assignedToUserId,
      })
      .from(schema.securityWorkItems)
      .where(eq(schema.securityWorkItems.id, item.id));

    let createdByName = "Unknown";
    if (fullItem?.createdByUserId) {
      const [u] = await db
        .select({ displayName: schema.appUsers.displayName })
        .from(schema.appUsers)
        .where(eq(schema.appUsers.id, fullItem.createdByUserId));
      if (u) createdByName = u.displayName;
    }

    let assignedToName: string | null = null;
    if (fullItem?.assignedToUserId) {
      const [u] = await db
        .select({ displayName: schema.appUsers.displayName })
        .from(schema.appUsers)
        .where(eq(schema.appUsers.id, fullItem.assignedToUserId));
      if (u) assignedToName = u.displayName;
    }

    // Count affected users for this role's within-role conflicts
    const affectedRows = await db
      .select({ userId: schema.sodConflicts.userId })
      .from(schema.sodConflicts)
      .where(
        and(
          eq(schema.sodConflicts.roleIdA, item.targetRoleId),
          eq(schema.sodConflicts.conflictType, "within_role")
        )
      );
    const affectedUserCount = new Set(affectedRows.map((r) => r.userId)).size;

    results.push({
      id: item.id,
      sodConflictId: item.sodConflictId,
      targetRoleId: item.targetRoleId,
      roleName: role?.roleName ?? "Unknown",
      roleCode: role?.roleCode ?? "",
      status: item.status,
      complianceNotes: item.complianceNotes,
      securityNotes: item.securityNotes,
      createdByUserName: createdByName,
      assignedToUserName: assignedToName,
      permissionA,
      permissionB,
      ruleName,
      severity: conflict?.severity ?? "medium",
      affectedUserCount,
      completedAt: item.completedAt,
      createdAt: item.createdAt,
    });
  }

  return results;
}

// ── Mutation Helpers ──────────────────────────────────────────────

export async function createSecurityWorkItem(data: {
  orgId: number;
  sodConflictId: number;
  targetRoleId: number;
  createdByUserId: number;
  assignedToUserId?: number;
  complianceNotes: string;
}): Promise<{ id: number }> {
  const [row] = await db
    .insert(schema.securityWorkItems)
    .values({
      organizationId: data.orgId,
      sodConflictId: data.sodConflictId,
      targetRoleId: data.targetRoleId,
      createdByUserId: data.createdByUserId,
      assignedToUserId: data.assignedToUserId ?? null,
      complianceNotes: data.complianceNotes,
      status: "open",
    })
    .returning({ id: schema.securityWorkItems.id });
  return row;
}

export async function updateConflictResolutionStatus(
  conflictId: number,
  status: string
): Promise<void> {
  await db
    .update(schema.sodConflicts)
    .set({ resolutionStatus: status })
    .where(eq(schema.sodConflicts.id, conflictId));
}

export async function updateWorkItemStatus(
  workItemId: number,
  status: string,
  securityNotes?: string
): Promise<void> {
  const updates: Record<string, string> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (securityNotes !== undefined) {
    updates.securityNotes = securityNotes;
  }
  await db
    .update(schema.securityWorkItems)
    .set(updates)
    .where(eq(schema.securityWorkItems.id, workItemId));
}

export async function completeSecurityWorkItem(
  workItemId: number,
  securityNotes: string,
): Promise<{ affectedAssignmentCount: number; targetRoleId: number; roleName: string }> {
  // Get the work item
  const [item] = await db
    .select()
    .from(schema.securityWorkItems)
    .where(eq(schema.securityWorkItems.id, workItemId));

  if (!item) throw new Error("Work item not found");

  // Mark work item complete
  await db
    .update(schema.securityWorkItems)
    .set({
      status: "resolved",
      securityNotes,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.securityWorkItems.id, workItemId));

  // Update conflict status
  await db
    .update(schema.sodConflicts)
    .set({ resolutionStatus: "redesign_complete" })
    .where(eq(schema.sodConflicts.id, item.sodConflictId));

  // Find all assignments using this role → set to remap_required
  const assignments = await db
    .select({ id: schema.userTargetRoleAssignments.id })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.targetRoleId, item.targetRoleId));

  for (const a of assignments) {
    await db
      .update(schema.userTargetRoleAssignments)
      .set({ status: "remap_required" })
      .where(eq(schema.userTargetRoleAssignments.id, a.id));
  }

  // Get role name for notification
  const [role] = await db
    .select({ roleName: schema.targetRoles.roleName })
    .from(schema.targetRoles)
    .where(eq(schema.targetRoles.id, item.targetRoleId));

  return {
    affectedAssignmentCount: assignments.length,
    targetRoleId: item.targetRoleId,
    roleName: role?.roleName ?? "Unknown",
  };
}
