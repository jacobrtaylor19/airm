import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { runPersonaGeneration } from "@/lib/ai/persona-generation";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { notifyUsersWithRoles } from "@/lib/notifications";
import { checkAIRate } from "@/lib/rate-limit-middleware";
import { safeError } from "@/lib/errors";

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
    jobType: "persona_generation",
    status: "running",
    startedAt: new Date().toISOString(),
    config: JSON.stringify({
      triggeredBy: user.username,
      triggeredByRole: user.role,
      scopedUserIds: scopedUserIds, // null = all users (admin)
    }),
  }).returning().get();

  try {
    const result = await runPersonaGeneration(job.id);

    db.update(schema.processingJobs).set({
      status: "completed",
      totalRecords: result.usersAssigned,
      processed: result.usersAssigned,
      completedAt: new Date().toISOString(),
    }).where(eq(schema.processingJobs.id, job.id)).run();

    db.insert(schema.auditLog).values({
      entityType: "processingJob",
      entityId: job.id,
      action: "persona_generation_completed",
      newValue: JSON.stringify(result),
    }).run();

    // Notify coordinators and admins that persona generation is complete
    notifyUsersWithRoles({
      roles: ["coordinator", "admin", "system_admin"],
      notificationType: "workflow_event",
      subject: "Persona generation complete",
      message: `Persona generation finished: ${result.personasCreated ?? 0} personas created, ${result.usersAssigned ?? 0} users assigned.`,
      actionUrl: "/personas",
    });

    return NextResponse.json({ jobId: job.id, ...result });
  } catch (err: unknown) {
    const message = safeError(err, "Unknown error");
    db.update(schema.processingJobs).set({
      status: "failed",
      errorLog: message,
      completedAt: new Date().toISOString(),
    }).where(eq(schema.processingJobs.id, job.id)).run();

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
