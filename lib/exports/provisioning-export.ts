import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export function generateProvisioningCsv(): string {
  const assignments = db.select({
    sourceUserId: schema.users.sourceUserId,
    displayName: schema.users.displayName,
    targetRoleId: schema.targetRoles.roleId,
    targetRoleName: schema.targetRoles.roleName,
    status: schema.userTargetRoleAssignments.status,
  })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .where(eq(schema.userTargetRoleAssignments.status, "approved"))
    .all();

  const header = "source_user_id,display_name,target_role_id,target_role_name,status";
  const rows = assignments.map(a =>
    `${csvEscape(a.sourceUserId)},${csvEscape(a.displayName)},${csvEscape(a.targetRoleId)},${csvEscape(a.targetRoleName)},${csvEscape(a.status)}`
  );

  return [header, ...rows].join("\n");
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
