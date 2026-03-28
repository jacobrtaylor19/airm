import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";
import { getDescendantOrgUnitIds, getDepartmentsInOrgScope } from "@/lib/org-hierarchy";

/**
 * Returns the list of user IDs this app user can see, based on their
 * org unit assignment. Returns null if the user has no scope restriction
 * (admin, viewer, sysadmin — sees everything).
 */
export async function getUserScope(appUser: AppUser & { assignedOrgUnitId?: number | null }): Promise<number[] | null> {
  // Admin, viewer, and system_admin see everything
  if (["admin", "system_admin", "viewer"].includes(appUser.role)) {
    return null; // null means "all users"
  }

  // Coordinator sees their org unit scope (same as mapper/approver)
  // Falls through to org unit resolution below

  // Get assignedOrgUnitId from the database if not provided
  let orgUnitId = appUser.assignedOrgUnitId;
  if (orgUnitId === undefined) {
    const [dbUser] = await db.select({ assignedOrgUnitId: schema.appUsers.assignedOrgUnitId })
      .from(schema.appUsers)
      .where(eq(schema.appUsers.id, appUser.id));
    orgUnitId = dbUser?.assignedOrgUnitId ?? null;
  }

  if (!orgUnitId) {
    // Fall back to work assignments (legacy approach)
    return getLegacyScopeUserIds(appUser);
  }

  // Get all descendant org unit IDs
  const ouIds = await getDescendantOrgUnitIds(orgUnitId);
  if (ouIds.length === 0) return [];

  const users = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(inArray(schema.users.orgUnitId, ouIds));

  return users.map(u => u.id);
}

/**
 * Returns the departments this app user can see, based on their org unit.
 * Returns null if no scope restriction.
 */
export async function getUserScopeDepartments(appUser: AppUser & { assignedOrgUnitId?: number | null }): Promise<string[] | null> {
  if (["admin", "system_admin", "viewer"].includes(appUser.role)) {
    return null;
  }

  let orgUnitId = appUser.assignedOrgUnitId;
  if (orgUnitId === undefined) {
    const [dbUser] = await db.select({ assignedOrgUnitId: schema.appUsers.assignedOrgUnitId })
      .from(schema.appUsers)
      .where(eq(schema.appUsers.id, appUser.id));
    orgUnitId = dbUser?.assignedOrgUnitId ?? null;
  }

  if (!orgUnitId) {
    // Coordinator has no legacy work assignment support — return empty scope
    if (appUser.role === "coordinator") return [];
    return getLegacyScopeDepartments(appUser);
  }

  return getDepartmentsInOrgScope(orgUnitId);
}

// ─── Legacy fallback (work_assignments table) ───

async function getLegacyScopeUserIds(appUser: AppUser): Promise<number[]> {
  const assignmentType = appUser.role === "mapper" ? "mapper" : appUser.role === "approver" ? "approver" : null;
  if (!assignmentType) return [];

  const assignments = await db.select().from(schema.workAssignments)
    .where(eq(schema.workAssignments.appUserId, appUser.id));

  const departments: string[] = [];
  const sourceUserIds: string[] = [];
  for (const a of assignments) {
    if (a.scopeType === "department") departments.push(a.scopeValue);
    else if (a.scopeType === "user") sourceUserIds.push(a.scopeValue);
  }

  if (departments.length === 0 && sourceUserIds.length === 0) return [];

  const ids = new Set<number>();
  if (departments.length > 0) {
    const users = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.department, departments));
    for (const u of users) ids.add(u.id);
  }
  if (sourceUserIds.length > 0) {
    const users = await db.select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.sourceUserId, sourceUserIds));
    for (const u of users) ids.add(u.id);
  }

  return Array.from(ids);
}

async function getLegacyScopeDepartments(appUser: AppUser): Promise<string[]> {
  const assignmentType = appUser.role === "mapper" ? "mapper" : appUser.role === "approver" ? "approver" : null;
  if (!assignmentType) return [];

  const assignments = await db.select().from(schema.workAssignments)
    .where(eq(schema.workAssignments.appUserId, appUser.id));

  return assignments
    .filter(a => a.scopeType === "department")
    .map(a => a.scopeValue);
}
