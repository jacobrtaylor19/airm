import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const jobId = parseInt(params.id, 10);
  if (isNaN(jobId)) {
    return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
  }

  const job = db
    .select()
    .from(schema.processingJobs)
    .where(eq(schema.processingJobs.id, jobId))
    .get();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    totalRecords: job.totalRecords,
    processed: job.processed,
    failed: job.failed,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    errorLog: job.errorLog,
  });
}
