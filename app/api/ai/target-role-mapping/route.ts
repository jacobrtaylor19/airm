import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { runTargetRoleMapping } from "@/lib/ai/target-role-mapping";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (user.role === "viewer") {
    return NextResponse.json({ error: "Insufficient permissions. Viewer role cannot invoke mapping operations." }, { status: 403 });
  }

  // Capture user scope at enqueue time for job isolation (WORKFLOW.md Note 6)
  const scopedUserIds = getUserScope(user);

  const job = db.insert(schema.processingJobs).values({
    jobType: "target_role_mapping",
    status: "running",
    startedAt: new Date().toISOString(),
    config: JSON.stringify({
      triggeredBy: user.username,
      triggeredByRole: user.role,
      scopedUserIds: scopedUserIds,
    }),
  }).returning().get();

  try {
    const result = await runTargetRoleMapping(job.id);

    db.update(schema.processingJobs).set({
      status: "completed",
      totalRecords: result.personasMapped,
      processed: result.personasMapped,
      completedAt: new Date().toISOString(),
    }).where(eq(schema.processingJobs.id, job.id)).run();

    db.insert(schema.auditLog).values({
      entityType: "processingJob",
      entityId: job.id,
      action: "target_role_mapping_completed",
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
