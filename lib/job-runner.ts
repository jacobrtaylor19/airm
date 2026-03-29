/**
 * Job runner with automatic retry for background AI pipeline tasks.
 * Wraps the fire-and-forget pattern with configurable retry logic.
 *
 * When all retries are exhausted the job is marked as "failed" with
 * a full error trail (dead-letter). Callers can query processing_jobs
 * to find dead-lettered jobs via `status = 'failed'` + `errorLog LIKE 'All%attempts failed%'`.
 */

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { reportError } from "@/lib/monitoring";

interface JobRunnerOptions {
  jobId: number;
  maxRetries?: number; // default: 2 (total attempts = 3)
  retryDelayMs?: number; // default: 5000 (5 seconds)
  onComplete?: () => Promise<void>; // e.g., send notifications, write audit log
}

/**
 * Execute a job function with retry logic.
 * Updates the processing_jobs table with status, error logs, and retry count.
 */
export async function runWithRetry(
  jobFn: () => Promise<void>,
  options: JobRunnerOptions
): Promise<void> {
  const { jobId, maxRetries = 2, retryDelayMs = 5000, onComplete } = options;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Update job to running with attempt info
      await db
        .update(schema.processingJobs)
        .set({
          status: "running",
          errorLog:
            attempt > 0
              ? `Retry attempt ${attempt}/${maxRetries}`
              : null,
        })
        .where(eq(schema.processingJobs.id, jobId));

      await jobFn();

      // Success — mark completed
      await db
        .update(schema.processingJobs)
        .set({
          status: "completed",
          completedAt: new Date().toISOString(),
          errorLog:
            attempt > 0
              ? `Succeeded on retry ${attempt}/${maxRetries}`
              : null,
        })
        .where(eq(schema.processingJobs.id, jobId));

      // Run post-completion hook (notifications, audit log, etc.)
      if (onComplete) {
        try {
          await onComplete();
        } catch (e) {
          reportError(e, { source: "job-runner-onComplete", jobId });
        }
      }

      return; // Success, exit retry loop
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      reportError(err, {
        source: "job-runner",
        jobId,
        attempt,
        maxRetries,
      });

      // Update error log with attempt info
      await db
        .update(schema.processingJobs)
        .set({
          errorLog: `Attempt ${attempt + 1}/${maxRetries + 1} failed: ${message}`,
        })
        .where(eq(schema.processingJobs.id, jobId))
        .catch(() => {});

      // Wait before retry (unless this was the last attempt)
      // Exponential back-off: delay * (attempt + 1)
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelayMs * (attempt + 1))
        );
      }
    }
  }

  // All retries exhausted — dead-letter the job
  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  await db
    .update(schema.processingJobs)
    .set({
      status: "failed",
      completedAt: new Date().toISOString(),
      errorLog: `All ${maxRetries + 1} attempts failed. Last error: ${message}`,
    })
    .where(eq(schema.processingJobs.id, jobId))
    .catch(() => {});
}
