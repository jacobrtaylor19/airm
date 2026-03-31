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

// Note: processingJobs does not have organization_id yet.
// orgId param is accepted for API consistency; filtering will be added
// when the column is added in a future migration.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getJobs(_orgId: number): Promise<JobRow[]> {
  return await db
    .select()
    .from(schema.processingJobs)
    .orderBy(desc(schema.processingJobs.createdAt));
}
