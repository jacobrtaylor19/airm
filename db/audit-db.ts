import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

const auditDbPath = process.env.AUDIT_DATABASE_URL ?? "./data/audit.db";
const auditDbDir = dirname(resolve(auditDbPath));
if (!existsSync(auditDbDir)) {
  mkdirSync(auditDbDir, { recursive: true });
}

const auditSqlite = new Database(auditDbPath);
auditSqlite.pragma("journal_mode = WAL");
auditSqlite.pragma("foreign_keys = ON");
auditSqlite.pragma("busy_timeout = 10000");

// Create audit_log table if it doesn't exist
auditSqlite.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    actor_email TEXT,
    ip_address TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Create index for common queries
auditSqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_email);
  CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
`);

/**
 * Insert an audit log entry. Only INSERT is exposed — no UPDATE or DELETE
 * to enforce immutability.
 */
export function insertAuditEntry(entry: {
  entityType: string;
  entityId: number;
  action: string;
  oldValue?: string | null;
  newValue?: string | null;
  actorEmail?: string | null;
  ipAddress?: string | null;
  metadata?: string | null;
}): void {
  const stmt = auditSqlite.prepare(`
    INSERT INTO audit_log (entity_type, entity_id, action, old_value, new_value, actor_email, ip_address, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run(
    entry.entityType,
    entry.entityId,
    entry.action,
    entry.oldValue ?? null,
    entry.newValue ?? null,
    entry.actorEmail ?? null,
    entry.ipAddress ?? null,
    entry.metadata ?? null
  );
}

/**
 * Query audit log entries (read-only). Used for the audit log UI and exports.
 */
export function queryAuditEntries(options?: {
  entityType?: string;
  actorEmail?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}): unknown[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.entityType) {
    conditions.push("entity_type = ?");
    params.push(options.entityType);
  }
  if (options?.actorEmail) {
    conditions.push("actor_email = ?");
    params.push(options.actorEmail);
  }
  if (options?.fromDate) {
    conditions.push("created_at >= ?");
    params.push(options.fromDate);
  }
  if (options?.toDate) {
    conditions.push("created_at <= ?");
    params.push(options.toDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = options?.limit ?? 1000;
  const offset = options?.offset ?? 0;

  const stmt = auditSqlite.prepare(
    `SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
  );
  return stmt.all(...params, limit, offset);
}

export { auditSqlite };
