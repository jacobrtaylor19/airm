import { insertAuditEntry } from "@/db/audit-db";

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
 * Write an audit log entry to the separate immutable audit database.
 * This is the single entry point for all audit logging.
 * All state-changing operations and security events should call this function.
 */
export function auditLog(entry: AuditEntry): void {
  try {
    insertAuditEntry({
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
