import { db } from "@/db";
import * as schema from "@/db/schema";
import { inArray, eq } from "drizzle-orm";
import type { UserAccessProfile } from "./types";

/**
 * Bulk-loads user access profiles in 3 queries instead of N+1.
 *
 * Query 1: All source role assignments for the given users (with role details via join)
 * Query 2: All source role → permission mappings for the discovered role IDs
 * Query 3: All source permissions for the discovered permission IDs
 *
 * Then assembles UserAccessProfile[] in memory using Maps.
 */
export async function loadUserProfiles(
  users: { id: number; sourceUserId: string; displayName: string; jobTitle: string | null; department: string | null }[]
): Promise<UserAccessProfile[]> {
  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  // Query 1: All role assignments for these users, joined with source role details
  const roleAssignmentRows = await db
    .select({
      userId: schema.userSourceRoleAssignments.userId,
      sourceRoleId: schema.userSourceRoleAssignments.sourceRoleId,
      roleId: schema.sourceRoles.roleId,
      roleName: schema.sourceRoles.roleName,
      domain: schema.sourceRoles.domain,
    })
    .from(schema.userSourceRoleAssignments)
    .innerJoin(
      schema.sourceRoles,
      eq(schema.sourceRoles.id, schema.userSourceRoleAssignments.sourceRoleId)
    )
    .where(inArray(schema.userSourceRoleAssignments.userId, userIds));

  // Build a map: userId → role assignments
  const userRolesMap = new Map<number, { sourceRoleId: number; roleId: string; roleName: string; domain: string | null }[]>();
  const allSourceRoleIds = new Set<number>();

  for (const row of roleAssignmentRows) {
    if (!userRolesMap.has(row.userId)) userRolesMap.set(row.userId, []);
    userRolesMap.get(row.userId)!.push({
      sourceRoleId: row.sourceRoleId,
      roleId: row.roleId,
      roleName: row.roleName,
      domain: row.domain,
    });
    allSourceRoleIds.add(row.sourceRoleId);
  }

  // Query 2: All role → permission junction rows for the discovered source role IDs
  const rolePermMap = new Map<number, number[]>(); // sourceRoleId → sourcePermissionId[]
  const allPermissionIds = new Set<number>();

  if (allSourceRoleIds.size > 0) {
    const rolePermRows = await db
      .select({
        sourceRoleId: schema.sourceRolePermissions.sourceRoleId,
        sourcePermissionId: schema.sourceRolePermissions.sourcePermissionId,
      })
      .from(schema.sourceRolePermissions)
      .where(inArray(schema.sourceRolePermissions.sourceRoleId, Array.from(allSourceRoleIds)));

    for (const row of rolePermRows) {
      if (!rolePermMap.has(row.sourceRoleId)) rolePermMap.set(row.sourceRoleId, []);
      rolePermMap.get(row.sourceRoleId)!.push(row.sourcePermissionId);
      allPermissionIds.add(row.sourcePermissionId);
    }
  }

  // Query 3: All source permissions for the discovered permission IDs
  const permIdMap = new Map<number, string>(); // sourcePermission.id → permissionId (text)

  if (allPermissionIds.size > 0) {
    const permRows = await db
      .select({
        id: schema.sourcePermissions.id,
        permissionId: schema.sourcePermissions.permissionId,
      })
      .from(schema.sourcePermissions)
      .where(inArray(schema.sourcePermissions.id, Array.from(allPermissionIds)));

    for (const row of permRows) {
      permIdMap.set(row.id, row.permissionId);
    }
  }

  // Assemble profiles in memory
  const profiles: UserAccessProfile[] = [];

  for (const user of users) {
    const roles = userRolesMap.get(user.id) || [];
    const permissionSet = new Set<string>();

    for (const role of roles) {
      const permIds = rolePermMap.get(role.sourceRoleId) || [];
      for (const pid of permIds) {
        const permText = permIdMap.get(pid);
        if (permText) permissionSet.add(permText);
      }
    }

    profiles.push({
      sourceUserId: user.sourceUserId,
      displayName: user.displayName,
      jobTitle: user.jobTitle,
      department: user.department,
      roles: roles.map((r) => ({ roleId: r.roleId, roleName: r.roleName, domain: r.domain })),
      permissions: Array.from(permissionSet),
    });
  }

  return profiles;
}
