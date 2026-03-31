import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

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

export async function getAuditLog(orgId: number): Promise<AuditLogRow[]> {
  return await db
    .select()
    .from(schema.auditLog)
    .where(orgScope(schema.auditLog.organizationId, orgId))
    .orderBy(desc(schema.auditLog.createdAt));
}
