import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";

export interface AuditLogRow {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  actorEmail: string | null;
  createdAt: string;
}

export async function getAuditLog(): Promise<AuditLogRow[]> {
  return await db
    .select()
    .from(schema.auditLog)
    .orderBy(desc(schema.auditLog.createdAt));
}
