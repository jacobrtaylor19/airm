/**
 * Release Context — server-side release filtering.
 *
 * Reads the selected release IDs from the `provisum_releases` cookie.
 * Returns null for "all releases" (admin default), or an array of release IDs.
 *
 * Non-admin users are restricted to releases they're assigned to via app_user_releases.
 */

import { cookies } from "next/headers";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

const COOKIE_NAME = "provisum_releases";

/**
 * Get the release IDs the current user has selected in the UI.
 * Returns null if "All Releases" is selected (admin default).
 * Returns an array of release IDs if specific releases are selected.
 */
export function getSelectedReleaseIds(): number[] | null {
  const cookieStore = cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw || raw === "all") return null;

  try {
    const ids = JSON.parse(raw);
    if (Array.isArray(ids) && ids.every((id: unknown) => typeof id === "number")) {
      return ids.length > 0 ? ids : null;
    }
  } catch {
    // Invalid cookie value
  }
  return null;
}

/**
 * Get the release IDs an app user is assigned to.
 * Admins/system_admins get null (all releases).
 * Other roles get only their assigned releases.
 */
export async function getUserReleaseIds(appUserId: number, role: string): Promise<number[] | null> {
  if (["admin", "system_admin"].includes(role)) return null;

  const assignments = await db
    .select({ releaseId: schema.appUserReleases.releaseId })
    .from(schema.appUserReleases)
    .where(eq(schema.appUserReleases.appUserId, appUserId));

  if (assignments.length === 0) {
    // No release assignments — show all releases (backwards compatible)
    return null;
  }

  return assignments.map((a) => a.releaseId);
}

/**
 * Get the effective release filter — intersection of user's assigned releases
 * and their UI selection. Returns null for "show everything".
 */
export async function getEffectiveReleaseIds(appUserId: number, role: string): Promise<number[] | null> {
  const userReleases = await getUserReleaseIds(appUserId, role);
  const selectedReleases = getSelectedReleaseIds();

  // Admin with no selection → all
  if (userReleases === null && selectedReleases === null) return null;

  // Admin with specific selection → use selection
  if (userReleases === null && selectedReleases !== null) return selectedReleases;

  // Non-admin with no selection → their assigned releases
  if (userReleases !== null && selectedReleases === null) return userReleases;

  // Both set → intersection
  if (userReleases !== null && selectedReleases !== null) {
    const allowed = new Set(userReleases);
    const filtered = selectedReleases.filter((id) => allowed.has(id));
    return filtered.length > 0 ? filtered : userReleases;
  }

  return null;
}

/**
 * Get all releases visible to an app user.
 */
export async function getVisibleReleases(appUserId: number, role: string) {
  const userReleaseIds = await getUserReleaseIds(appUserId, role);

  if (userReleaseIds === null) {
    // Admin — see all releases
    return await db.select().from(schema.releases);
  }

  if (userReleaseIds.length === 0) {
    // No assignments — show all (backwards compatible)
    return await db.select().from(schema.releases);
  }

  return await db
    .select()
    .from(schema.releases)
    .where(inArray(schema.releases.id, userReleaseIds));
}

/**
 * Get user IDs scoped to the given release IDs.
 * Returns null if releaseIds is null (no filter).
 */
export async function getUserIdsForReleases(releaseIds: number[] | null): Promise<number[] | null> {
  if (releaseIds === null) return null;

  const rows = await db
    .select({ userId: schema.releaseUsers.userId })
    .from(schema.releaseUsers)
    .where(inArray(schema.releaseUsers.releaseId, releaseIds));

  return Array.from(new Set(rows.map((r) => r.userId)));
}
