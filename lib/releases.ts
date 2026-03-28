import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";

export type ReleaseInfo = { id: number; name: string; isActive: boolean | null };

/**
 * Returns releases visible to this app user.
 * - admin / system_admin / viewer: all releases
 * - mapper / approver: only releases whose org-unit scope includes their assigned org unit
 */
export async function getReleasesForAppUser(
  appUser: AppUser & { assignedOrgUnitId?: number | null }
): Promise<ReleaseInfo[]> {
  const isUnrestricted = ["admin", "system_admin", "viewer"].includes(appUser.role);

  if (isUnrestricted) {
    return db
      .select({ id: schema.releases.id, name: schema.releases.name, isActive: schema.releases.isActive })
      .from(schema.releases)
      .orderBy(schema.releases.name);
  }

  // Look up assigned org unit if not already on the user object
  let orgUnitId = appUser.assignedOrgUnitId;
  if (orgUnitId === undefined) {
    const [row] = await db
      .select({ assignedOrgUnitId: schema.appUsers.assignedOrgUnitId })
      .from(schema.appUsers)
      .where(eq(schema.appUsers.id, appUser.id));
    orgUnitId = row?.assignedOrgUnitId ?? null;
  }

  if (!orgUnitId) {
    // No org unit assigned — graceful fallback: show all releases
    return db
      .select({ id: schema.releases.id, name: schema.releases.name, isActive: schema.releases.isActive })
      .from(schema.releases)
      .orderBy(schema.releases.name);
  }

  const rows = await db
    .select({ releaseId: schema.releaseOrgUnits.releaseId })
    .from(schema.releaseOrgUnits)
    .where(eq(schema.releaseOrgUnits.orgUnitId, orgUnitId));

  if (rows.length === 0) return [];

  return db
    .select({ id: schema.releases.id, name: schema.releases.name, isActive: schema.releases.isActive })
    .from(schema.releases)
    .where(inArray(schema.releases.id, rows.map((r) => r.releaseId)))
    .orderBy(schema.releases.name);
}

/**
 * Returns the set of source-user IDs that belong to a release (direct + org-unit members).
 * Returns null if the release has no scope entries defined (meaning "show all").
 */
export async function getReleaseUserIds(releaseId: number): Promise<number[] | null> {
  const directRows = await db
    .select({ userId: schema.releaseUsers.userId })
    .from(schema.releaseUsers)
    .where(eq(schema.releaseUsers.releaseId, releaseId));

  const ouRows = await db
    .select({ orgUnitId: schema.releaseOrgUnits.orgUnitId })
    .from(schema.releaseOrgUnits)
    .where(eq(schema.releaseOrgUnits.releaseId, releaseId));

  if (directRows.length === 0 && ouRows.length === 0) {
    return null; // No scope defined — caller treats this as "show all"
  }

  const ids = new Set<number>(directRows.map((r) => r.userId));

  if (ouRows.length > 0) {
    const ouIds = ouRows.map((r) => r.orgUnitId);
    const ouUsers = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(inArray(schema.users.orgUnitId, ouIds));
    for (const u of ouUsers) ids.add(u.id);
  }

  return Array.from(ids);
}
