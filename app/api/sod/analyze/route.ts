import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { runSodAnalysis } from "@/lib/sod/sod-analysis";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { notifyUsersWithRoles } from "@/lib/notifications";
import { checkAIRate } from "@/lib/rate-limit-middleware";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.role === "viewer") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const rateLimited = checkAIRate(req, String(user.id));
  if (rateLimited) return rateLimited;

  // Capture user scope at enqueue time for job isolation (WORKFLOW.md Note 6)
  const scopedUserIds = getUserScope(user);

  const job = db.insert(schema.processingJobs).values({
    jobType: "sod_analysis",
    status: "running",
    startedAt: new Date().toISOString(),
    config: JSON.stringify({
      triggeredBy: user.username,
      triggeredByRole: user.role,
      scopedUserIds: scopedUserIds,
    }),
  }).returning().get();

  try {
    const result = runSodAnalysis();

    db.update(schema.processingJobs).set({
      status: "completed",
      totalRecords: result.usersAnalyzed,
      processed: result.usersAnalyzed,
      completedAt: new Date().toISOString(),
    }).where(eq(schema.processingJobs.id, job.id)).run();

    db.insert(schema.auditLog).values({
      entityType: "processingJob",
      entityId: job.id,
      action: "sod_analysis_completed",
      newValue: JSON.stringify(result),
    }).run();

    // Notify coordinators and admins about SOD analysis results
    const conflictCount = result.conflictsFound ?? 0;
    if (conflictCount > 0) {
      notifyUsersWithRoles({
        roles: ["coordinator", "admin", "system_admin"],
        notificationType: "workflow_event",
        subject: "SOD conflicts detected",
        message: `SOD analysis found ${conflictCount} conflict(s) across ${result.usersAnalyzed ?? 0} users analyzed. Review and resolve these conflicts.`,
        actionUrl: "/sod",
      });
    }

    return NextResponse.json({ jobId: job.id, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    db.update(schema.processingJobs).set({
      status: "failed",
      errorLog: message,
      completedAt: new Date().toISOString(),
    }).where(eq(schema.processingJobs.id, job.id)).run();

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
