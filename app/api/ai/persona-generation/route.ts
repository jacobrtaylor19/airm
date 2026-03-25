import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { runPersonaGeneration } from "@/lib/ai/persona-generation";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.role === "viewer") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

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
