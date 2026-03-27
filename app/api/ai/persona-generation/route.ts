import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { runPersonaGeneration } from "@/lib/ai/persona-generation";
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

  // Capture user scope at enqueue time for job isolation
  const scopedUserIds = getUserScope(user);

  const job = db.insert(schema.processingJobs).values({
    jobType: "persona_generation",
    status: "running",
    startedAt: new Date().toISOString(),
    config: JSON.stringify({
      triggeredBy: user.username,
      triggeredByRole: user.role,
      scopedUserIds: scopedUserIds,
    }),
  }).returning().get();

  // Fire-and-forget: run generation in background, return job ID immediately.
  // This allows the user to navigate away without killing the process.
  runPersonaGeneration(job.id)
    .then((result) => {
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

      notifyUsersWithRoles({
        roles: ["coordinator", "admin", "system_admin"],
        notificationType: "workflow_event",
        subject: "Persona generation complete",
        message: `Persona generation finished: ${result.personasCreated ?? 0} personas created, ${result.usersAssigned ?? 0} users assigned.`,
        actionUrl: "/personas",
      });
    })
    .catch((err: unknown) => {
      // Store the REAL error in the DB for debugging (not sanitized)
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[persona-generation] Job ${job.id} failed:`, message);
      db.update(schema.processingJobs).set({
        status: "failed",
        errorLog: message,
        completedAt: new Date().toISOString(),
      }).where(eq(schema.processingJobs.id, job.id)).run();
    });

  // Return immediately — client polls /api/jobs/[id] for status
  return NextResponse.json({ jobId: job.id, status: "running" });
}
