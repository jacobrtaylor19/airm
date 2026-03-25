import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { TimelineClient } from "./timeline-client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["system_admin", "admin", "project_manager"];

export interface TimelineRelease {
  id: number;
  name: string;
  status: string;
  targetDate: string | null;
  completedDate: string | null;
  createdAt: string;
  completionPct: number;
  userCount: number;
}

export default function TimelinePage() {
  requireRole(ALLOWED_ROLES);

  const allReleases = db.select().from(schema.releases).orderBy(schema.releases.targetDate).all();

  const releaseData: TimelineRelease[] = allReleases.map((r) => {
    const totalAssignments = db
      .select({ count: count() })
      .from(schema.userTargetRoleAssignments)
      .where(eq(schema.userTargetRoleAssignments.releaseId, r.id))
      .get()!.count;

    const approvedAssignments = db
      .select({ count: count() })
      .from(schema.userTargetRoleAssignments)
      .where(
        sql`${schema.userTargetRoleAssignments.releaseId} = ${r.id} AND ${schema.userTargetRoleAssignments.status} = 'approved'`
      )
      .get()!.count;

    const userCount = db
      .select({ count: count() })
      .from(schema.releaseUsers)
      .where(eq(schema.releaseUsers.releaseId, r.id))
      .get()!.count;

    const completionPct = totalAssignments > 0 ? Math.round((approvedAssignments / totalAssignments) * 100) : 0;

    return {
      id: r.id,
      name: r.name,
      status: r.status,
      targetDate: r.targetDate,
      completedDate: r.completedDate,
      createdAt: r.createdAt,
      completionPct,
      userCount,
    };
  });

  return <TimelineClient releases={releaseData} />;
}
