import { db } from "@/db";
import * as schema from "@/db/schema";
import { sql, eq, and, inArray } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";
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

const approvalQueueSelect = {
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
};

function approvalQueueBase() {
  return db
    .select(approvalQueueSelect)
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .leftJoin(schema.personas, eq(schema.personas.id, schema.userTargetRoleAssignments.derivedFromPersonaId));
}

export async function getApprovalQueue(orgId: number): Promise<ApprovalRow[]> {
  return await approvalQueueBase().where(orgScope(schema.users.organizationId, orgId));
}

export async function getApprovalQueueScoped(orgId: number, appUserId: number): Promise<ApprovalRow[]> {
  const scope = await getAssignedScope(appUserId, "approver");

  // If no assignments, return empty (not everything)
  if (scope.departments.length === 0 && scope.userIds.length === 0) return [];

  const scopedUserIds = await getSourceUserIdsInScope(scope);
  if (scopedUserIds.length === 0) return [];

  return await approvalQueueBase()
    .where(and(inArray(schema.userTargetRoleAssignments.userId, scopedUserIds), orgScope(schema.users.organizationId, orgId)));
}
