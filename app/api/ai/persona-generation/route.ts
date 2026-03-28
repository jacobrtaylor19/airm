import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { runPersonaGeneration } from "@/lib/ai/persona-generation";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { notifyUsersWithRoles } from "@/lib/notifications";
import { checkAIRate } from "@/lib/rate-limit-middleware";
import { waitUntil } from "@vercel/functions";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.role === "viewer") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const rateLimited = checkAIRate(req, String(user.id));
  if (rateLimited) return rateLimited;

  // Capture user scope at enqueue time for job isolation
  const scopedUserIds = await getUserScope(user);

  const [job] = await db.insert(schema.processingJobs).values({
    jobType: "persona_generation",
    status: "running",
    startedAt: new Date().toISOString(),
    config: JSON.stringify({
      triggeredBy: user.username,
      triggeredByRole: user.role,
      scopedUserIds: scopedUserIds,
    }),
  }).returning();

  // Fire-and-forget: run generation in background, return job ID immediately.
  const promise = runPersonaGeneration(job.id)
    .then(async (result) => {
      await db.update(schema.processingJobs).set({
        status: "completed",
        totalRecords: result.usersAssigned,
        processed: result.usersAssigned,
        completedAt: new Date().toISOString(),
      }).where(eq(schema.processingJobs.id, job.id));

      await db.insert(schema.auditLog).values({
        entityType: "processingJob",
        entityId: job.id,
        action: "persona_generation_completed",
        newValue: JSON.stringify(result),
      });

      await notifyUsersWithRoles({
        roles: ["coordinator", "admin", "system_admin"],
        notificationType: "workflow_event",
        subject: "Persona generation complete",
        message: `Persona generation finished: ${result.personasCreated ?? 0} personas created, ${result.usersAssigned ?? 0} users assigned.`,
        actionUrl: "/personas",
      });
    })
    .catch(async (err: unknown) => {
      // Store the REAL error in the DB for debugging (not sanitized)
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[persona-generation] Job ${job.id} failed:`, message);
      await db.update(schema.processingJobs).set({
        status: "failed",
        errorLog: message,
        completedAt: new Date().toISOString(),
      }).where(eq(schema.processingJobs.id, job.id));
    });

  waitUntil(promise);

  // Return immediately — client polls /api/jobs/[id] for status
  return NextResponse.json({ jobId: job.id, status: "running" });
}
