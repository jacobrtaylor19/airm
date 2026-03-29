import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { UserRow } from "./users";
import { getUsers } from "./users";

export async function getUserIdsInReleases(releaseIds: number[] | null): Promise<number[] | null> {
  if (releaseIds === null || releaseIds.length === 0) return null;
  const rows = await db
    .select({ userId: schema.releaseUsers.userId })
    .from(schema.releaseUsers)
    .where(inArray(schema.releaseUsers.releaseId, releaseIds));
  return Array.from(new Set(rows.map((r) => r.userId)));
}

export async function getSourceRoleIdsInReleases(releaseIds: number[] | null): Promise<number[] | null> {
  if (releaseIds === null || releaseIds.length === 0) return null;
  const rows = await db
    .select({ sourceRoleId: schema.releaseSourceRoles.sourceRoleId })
    .from(schema.releaseSourceRoles)
    .where(inArray(schema.releaseSourceRoles.releaseId, releaseIds));
  return rows.length > 0 ? Array.from(new Set(rows.map((r) => r.sourceRoleId))) : null;
}

export async function getTargetRoleIdsInReleases(releaseIds: number[] | null): Promise<number[] | null> {
  if (releaseIds === null || releaseIds.length === 0) return null;
  const rows = await db
    .select({ targetRoleId: schema.releaseTargetRoles.targetRoleId })
    .from(schema.releaseTargetRoles)
    .where(inArray(schema.releaseTargetRoles.releaseId, releaseIds));
  return rows.length > 0 ? Array.from(new Set(rows.map((r) => r.targetRoleId))) : null;
}

export async function getAssignedScope(appUserId: number, assignmentType: string): Promise<{ departments: string[]; userIds: string[] }> {
  const assignments = await db.select().from(schema.workAssignments)
    .where(and(
      eq(schema.workAssignments.appUserId, appUserId),
      eq(schema.workAssignments.assignmentType, assignmentType)
    ));

  const departments: string[] = [];
  const userIds: string[] = [];

  for (const a of assignments) {
    if (a.scopeType === "department") departments.push(a.scopeValue);
    else if (a.scopeType === "user") userIds.push(a.scopeValue);
  }

  return { departments, userIds };
}

export async function getSourceUserIdsInScope(scope: { departments: string[]; userIds: string[] }): Promise<number[]> {
  const ids = new Set<number>();

  if (scope.departments.length > 0) {
    const users = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.department, scope.departments));
    for (const u of users) ids.add(u.id);
  }

  if (scope.userIds.length > 0) {
    const users = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.sourceUserId, scope.userIds));
    for (const u of users) ids.add(u.id);
  }

  return Array.from(ids);
}

export async function getUsersScoped(appUserId: number, assignmentType: string): Promise<UserRow[]> {
  const scope = await getAssignedScope(appUserId, assignmentType);

  if (scope.departments.length === 0 && scope.userIds.length === 0) return [];

  const scopedUserIds = await getSourceUserIdsInScope(scope);
  if (scopedUserIds.length === 0) return [];

  return await getUsers(scopedUserIds);
}

export interface AssignedMapperApprover {
  mapperName: string | null;
  mapperOrgUnitName: string | null;
  approverName: string | null;
  approverOrgUnitName: string | null;
}

/**
 * Finds the mapper and approver assigned to a user's org unit.
 * Walks up the org hierarchy from the user's org unit to find
 * the closest mapper/approver assignment.
 */
export async function getAssignedMapperApproverForUser(orgUnitId: number | null): Promise<AssignedMapperApprover> {
  if (!orgUnitId) return { mapperName: null, mapperOrgUnitName: null, approverName: null, approverOrgUnitName: null };

  // Get all org units to build the ancestry chain
  const allOrgUnits = await db.select().from(schema.orgUnits);
  const orgUnitMap = new Map(allOrgUnits.map(u => [u.id, u]));

  // Get all app user assignments
  const appUserAssignments = await db.select({
    displayName: schema.appUsers.displayName,
    role: schema.appUsers.role,
    assignedOrgUnitId: schema.appUsers.assignedOrgUnitId,
  }).from(schema.appUsers).where(eq(schema.appUsers.isActive, true));

  const mapperByOu = new Map<number, string>();
  const approverByOu = new Map<number, string>();
  for (const au of appUserAssignments) {
    if (au.assignedOrgUnitId) {
      if (au.role === "mapper") mapperByOu.set(au.assignedOrgUnitId, au.displayName);
      if (au.role === "approver") approverByOu.set(au.assignedOrgUnitId, au.displayName);
    }
  }

  // Walk up the org hierarchy to find the closest assignment
  let mapperName: string | null = null;
  let mapperOrgUnitName: string | null = null;
  let approverName: string | null = null;
  let approverOrgUnitName: string | null = null;
  let currentId: number | null = orgUnitId;

  while (currentId !== null) {
    if (!mapperName && mapperByOu.has(currentId)) {
      mapperName = mapperByOu.get(currentId)!;
      mapperOrgUnitName = orgUnitMap.get(currentId)?.name ?? null;
    }
    if (!approverName && approverByOu.has(currentId)) {
      approverName = approverByOu.get(currentId)!;
      approverOrgUnitName = orgUnitMap.get(currentId)?.name ?? null;
    }
    if (mapperName && approverName) break;

    const unit = orgUnitMap.get(currentId);
    currentId = unit?.parentId ?? null;
  }

  return { mapperName, mapperOrgUnitName, approverName, approverOrgUnitName };
}

export interface UserRoleAssignmentRow {
  id: number;
  userName: string;
  roleName: string;
  system: string | null;
  assignedDate: string | null;
}

export async function getUserSourceRoleAssignments(): Promise<UserRoleAssignmentRow[]> {
  return await db
    .select({
      id: schema.userSourceRoleAssignments.id,
      userName: schema.users.displayName,
      roleName: schema.sourceRoles.roleName,
      system: schema.sourceRoles.system,
      assignedDate: schema.userSourceRoleAssignments.assignedDate,
    })
    .from(schema.userSourceRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userSourceRoleAssignments.userId))
    .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.userSourceRoleAssignments.sourceRoleId));
}

export interface SourcePermissionRow {
  id: number;
  permissionId: string;
  permissionName: string | null;
  description: string | null;
  system: string | null;
  permissionType: string | null;
  riskLevel: string | null;
}

export async function getAllSourcePermissions(): Promise<SourcePermissionRow[]> {
  return await db.select().from(schema.sourcePermissions);
}

export interface TargetPermissionRow {
  id: number;
  permissionId: string;
  permissionName: string | null;
  description: string | null;
  system: string | null;
  permissionType: string | null;
  riskLevel: string | null;
}

export async function getAllTargetPermissions(): Promise<TargetPermissionRow[]> {
  return await db.select().from(schema.targetPermissions);
}
