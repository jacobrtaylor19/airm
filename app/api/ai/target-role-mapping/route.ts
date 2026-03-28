import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { runTargetRoleMapping } from "@/lib/ai/target-role-mapping";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
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
    return NextResponse.json({ error: "Insufficient permissions. Viewer role cannot invoke mapping operations." }, { status: 403 });
  }

  const rateLimited = checkAIRate(req, String(user.id));
  if (rateLimited) return rateLimited;

  const scopedUserIds = await getUserScope(user);

  const [job] = await db.insert(schema.processingJobs).values({
    jobType: "target_role_mapping",
    status: "running",
    startedAt: new Date().toISOString(),
    config: JSON.stringify({
      triggeredBy: user.username,
      triggeredByRole: user.role,
      scopedUserIds: scopedUserIds,
    }),
  }).returning();

  // Fire-and-forget: run in background so navigation doesn't kill it
  const promise = runTargetRoleMapping(job.id)
    .then(async (result) => {
      await db.update(schema.processingJobs).set({
        status: "completed",
        totalRecords: result.personasMapped,
        processed: result.personasMapped,
        completedAt: new Date().toISOString(),
      }).where(eq(schema.processingJobs.id, job.id));

      await db.insert(schema.auditLog).values({
        entityType: "processingJob",
        entityId: job.id,
        action: "target_role_mapping_completed",
        newValue: JSON.stringify(result),
      });
    })
    .catch(async (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[target-role-mapping] Job ${job.id} failed:`, message);
      await db.update(schema.processingJobs).set({
        status: "failed",
        errorLog: message,
        completedAt: new Date().toISOString(),
      }).where(eq(schema.processingJobs.id, job.id));
    });

  waitUntil(promise);

  return NextResponse.json({ jobId: job.id, status: "running" });
}
