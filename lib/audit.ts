import { db } from "@/db";
import * as schema from "@/db/schema";

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
 * Write an audit log entry. This is the single entry point for all audit logging.
 * All state-changing operations and security events should call this function.
 */
export function auditLog(entry: AuditEntry): void {
  try {
    db.insert(schema.auditLog)
      .values({
        entityType: entry.entityType,
        entityId: entry.entityId ?? 0,
        action: entry.action,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        actorEmail: entry.actorEmail,
        ipAddress: entry.ipAddress ?? null,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      })
      .run();
  } catch (err) {
    // Audit logging should never break the main operation
    console.error("Failed to write audit log:", err);
  }
}
