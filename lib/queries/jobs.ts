import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";

export interface JobRow {
  id: number;
  jobType: string;
  status: string;
  totalRecords: number | null;
  processed: number | null;
  failed: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  errorLog: string | null;
}

export async function getJobs(): Promise<JobRow[]> {
  return await db
    .select()
    .from(schema.processingJobs)
    .orderBy(desc(schema.processingJobs.createdAt));
}
