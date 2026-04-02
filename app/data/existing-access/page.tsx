import { requireAuth } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ExistingAccessClient } from "./existing-access-client";

export const dynamic = "force-dynamic";

export default async function ExistingAccessPage() {
  const user = await requireAuth();
  const orgId = getOrgId(user);

  // Query existing access assignments with user and target role details
  const assignments = await db
    .select({
      assignmentId: schema.userTargetRoleAssignments.id,
      userId: schema.userTargetRoleAssignments.userId,
      targetRoleId: schema.userTargetRoleAssignments.targetRoleId,
      status: schema.userTargetRoleAssignments.status,
      createdAt: schema.userTargetRoleAssignments.createdAt,
      // User fields
      displayName: schema.users.displayName,
      sourceUserId: schema.users.sourceUserId,
      department: schema.users.department,
      // Target role fields
      roleName: schema.targetRoles.roleName,
      domain: schema.targetRoles.domain,
    })
    .from(schema.userTargetRoleAssignments)
    .leftJoin(
      schema.users,
      eq(schema.userTargetRoleAssignments.userId, schema.users.id)
    )
    .leftJoin(
      schema.targetRoles,
      eq(schema.userTargetRoleAssignments.targetRoleId, schema.targetRoles.id)
    )
    .where(
      and(
        eq(schema.userTargetRoleAssignments.releasePhase, "existing"),
        eq(schema.userTargetRoleAssignments.assignmentType, "existing_access"),
        eq(schema.users.organizationId, orgId)
      )
    );

  // Group assignments by user
  const userMap = new Map<
    number,
    {
      userId: number;
      displayName: string;
      sourceUserId: string;
      department: string | null;
      roles: { roleName: string; domain: string | null }[];
    }
  >();

  for (const row of assignments) {
    if (!row.userId || !row.displayName) continue;

    if (!userMap.has(row.userId)) {
      userMap.set(row.userId, {
        userId: row.userId,
        displayName: row.displayName,
        sourceUserId: row.sourceUserId ?? "",
        department: row.department,
        roles: [],
      });
    }

    if (row.roleName) {
      userMap.get(row.userId)!.roles.push({
        roleName: row.roleName,
        domain: row.domain,
      });
    }
  }

  const groupedData = Array.from(userMap.values());

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Existing Production Access
        </h1>
        <p className="text-sm text-muted-foreground">
          Current target role assignments for users in production. These
          represent existing access prior to the migration.
        </p>
      </div>
      <ExistingAccessClient data={groupedData} />
    </div>
  );
}
