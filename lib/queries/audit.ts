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

export interface RecentActivityItem {
  id: number;
  action: string;
  entityType: string;
  actorEmail: string | null;
  createdAt: string;
}

export async function getRecentActivity(orgId: number, limit = 8): Promise<RecentActivityItem[]> {
  return await db
    .select({
      id: schema.auditLog.id,
      action: schema.auditLog.action,
      entityType: schema.auditLog.entityType,
      actorEmail: schema.auditLog.actorEmail,
      createdAt: schema.auditLog.createdAt,
    })
    .from(schema.auditLog)
    .where(orgScope(schema.auditLog.organizationId, orgId))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(limit);
}
