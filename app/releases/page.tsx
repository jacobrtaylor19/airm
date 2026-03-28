import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { ReleasesClient } from "./releases-client";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["admin", "system_admin"];

export default async function ReleasesPage() {
  const currentUser = await requireAuth();
  const isAdmin = ADMIN_ROLES.includes(currentUser.role);

  // Get all releases + their org unit scope memberships
  const allReleases = await db.select().from(schema.releases).orderBy(schema.releases.createdAt);
  const allReleaseOrgUnits = await db.select().from(schema.releaseOrgUnits);
  const allReleaseUsers = await db.select().from(schema.releaseUsers);
  const allAssignments = await db.select().from(schema.userTargetRoleAssignments);

  // For non-admins: filter releases to those that include their assigned org unit
  let visibleReleases = allReleases;
  if (!isAdmin && currentUser.assignedOrgUnitId) {
    // Find release IDs that include this user's org unit
    const matchingReleaseIds = new Set(
      allReleaseOrgUnits
        .filter((ru) => ru.orgUnitId === currentUser.assignedOrgUnitId)
        .map((ru) => ru.releaseId)
    );
    // Also check work assignments for additional org unit scope
    const workAssignments = await db
      .select()
      .from(schema.workAssignments)
      .where(eq(schema.workAssignments.appUserId, currentUser.id));
    for (const wa of workAssignments) {
      if (wa.scopeType === "org_unit" && wa.scopeValue) {
        const orgUnitId = parseInt(wa.scopeValue);
        allReleaseOrgUnits
          .filter((ru) => ru.orgUnitId === orgUnitId)
          .forEach((ru) => matchingReleaseIds.add(ru.releaseId));
      }
    }
    visibleReleases = allReleases.filter((r) => matchingReleaseIds.has(r.id));
  }

  // Attach stats + scope info to each visible release
  const releasesWithStats = visibleReleases.map((r) => {
    const assignments = allAssignments.filter((a) => a.releaseId === r.id);
    const total = assignments.length;
    const approved = assignments.filter((a) => a.status === "approved").length;
    const sodFlagged = assignments.filter((a) => (a.sodConflictCount ?? 0) > 0).length;
    const pending = assignments.filter(
      (a) => a.status === "draft" || a.status === "pending_approval"
    ).length;
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
    const userCount = allReleaseUsers.filter((ru) => ru.releaseId === r.id).length;
    const orgUnitCount = allReleaseOrgUnits.filter((ru) => ru.releaseId === r.id).length;
    return { ...r, stats: { total, approved, sodFlagged, pending, pct, userCount, orgUnitCount } };
  });

  const unlinked = isAdmin
    ? allAssignments.filter((a) => a.releaseId === null).length
    : 0;

  return (
    <ReleasesClient
      releases={releasesWithStats}
      unlinkedCount={unlinked}
      isAdmin={isAdmin}
    />
  );
}
