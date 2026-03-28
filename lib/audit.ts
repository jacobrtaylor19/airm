import { db } from "@/db";
import * as schema from "@/db/schema";
import { desc, eq, gte, lte, and } from "drizzle-orm";

export interface AuditEntry {
  entityType: string;
  entityId?: number;
  action: string;
  oldValue?: string;
  newValue?: string;
  actorEmail: string;
  actorRole?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry using Drizzle ORM.
 * This is the single entry point for all audit logging.
 * All state-changing operations and security events should call this function.
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(schema.auditLog).values({
      entityType: entry.entityType,
      entityId: entry.entityId ?? 0,
      action: entry.action,
      oldValue: entry.oldValue ?? null,
      newValue: entry.newValue ?? null,
      actorEmail: entry.actorEmail,
      ipAddress: entry.ipAddress ?? null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  } catch (err) {
    // Audit logging should never break the main operation
    console.error("Failed to write audit log:", err);
  }
}

/**
 * Query audit log entries (read-only). Used for the audit log UI and exports.
 */
export async function queryAuditEntries(options?: {
  entityType?: string;
  actorEmail?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): Promise<(typeof schema.auditLog.$inferSelect)[]> {
  const conditions = [];

  if (options?.entityType) {
    conditions.push(eq(schema.auditLog.entityType, options.entityType));
  }
  if (options?.actorEmail) {
    conditions.push(eq(schema.auditLog.actorEmail, options.actorEmail));
  }
  if (options?.fromDate) {
    conditions.push(gte(schema.auditLog.createdAt, options.fromDate));
  }
  if (options?.toDate) {
    conditions.push(lte(schema.auditLog.createdAt, options.toDate));
  }

  const limit = options?.limit ?? 1000;
  const offset = options?.offset ?? 0;

  return db
    .select()
    .from(schema.auditLog)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(schema.auditLog.id))
    .limit(limit)
    .offset(offset);
}
