import { db } from "@/db";
import * as schema from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { getAssignedScope, getSourceUserIdsInScope } from "./common";

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

export async function getApprovalQueueScoped(appUserId: number): Promise<ApprovalRow[]> {
  const scope = await getAssignedScope(appUserId, "approver");
  const all = await getApprovalQueue();

  // If no assignments, return empty (not everything)
  if (scope.departments.length === 0 && scope.userIds.length === 0) return [];

  const scopedUserIds = await getSourceUserIdsInScope(scope);
  const idSet = new Set(scopedUserIds);
  return all.filter((a) => idSet.has(a.userId));
}
