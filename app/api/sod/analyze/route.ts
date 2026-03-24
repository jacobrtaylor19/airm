import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { runSodAnalysis } from "@/lib/sod/sod-analysis";

export async function POST() {
  const job = db.insert(schema.processingJobs).values({
    jobType: "sod_analysis",
    status: "running",
    startedAt: new Date().toISOString(),
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
