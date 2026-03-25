import { db } from "@/db";
import * as schema from "@/db/schema";
import { ReleasesClient } from "./releases-client";

export const dynamic = "force-dynamic";

export default function ReleasesPage() {
  const releases = db.select().from(schema.releases).orderBy(schema.releases.createdAt).all();

  const allAssignments = db.select().from(schema.userTargetRoleAssignments).all();

  const releasesWithStats = releases.map((r) => {
    const assignments = allAssignments.filter((a) => a.releaseId === r.id);
    const total = assignments.length;
    const approved = assignments.filter((a) => a.status === "approved").length;
    const sodFlagged = assignments.filter((a) => (a.sodConflictCount ?? 0) > 0).length;
    const pending = assignments.filter(
      (a) => a.status === "draft" || a.status === "pending_approval"
    ).length;
    const pct = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { ...r, stats: { total, approved, sodFlagged, pending, pct } };
  });

  // Also count unlinked assignments
  const unlinked = allAssignments.filter((a) => a.releaseId === null).length;

  return <ReleasesClient releases={releasesWithStats} unlinkedCount={unlinked} />;
}
