import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function generateProvisioningCsv(): Promise<string> {
  const assignments = await db.select({
    sourceUserId: schema.users.sourceUserId,
    displayName: schema.users.displayName,
    email: schema.users.email,
    department: schema.users.department,
    targetRoleId: schema.targetRoles.roleId,
    targetRoleName: schema.targetRoles.roleName,
    status: schema.userTargetRoleAssignments.status,
  })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .where(eq(schema.userTargetRoleAssignments.status, "approved"));

  const now = new Date().toISOString().split("T")[0];
  const brandedHeader = `# Provisum Provisioning Export — Generated ${now}`;
  const brandedSubheader = `# Approved role assignments ready for provisioning`;
  const header = "employee_id,display_name,email,department,target_role_id,target_role_name,status";
  const rows = assignments.map(a =>
    [a.sourceUserId, a.displayName, a.email ?? "", a.department ?? "", a.targetRoleId, a.targetRoleName, a.status]
      .map(csvEscape).join(",")
  );

  return [brandedHeader, brandedSubheader, header, ...rows].join("\n");
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
