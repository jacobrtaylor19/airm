import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

// Lazy database initialization to avoid SQLITE_BUSY during next build.
// During build, multiple workers import this module concurrently — opening
// the database eagerly causes lock contention on Render's filesystem.

let _db: BetterSQLite3Database<typeof schema> | null = null;

function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;

  const dbPath = process.env.DATABASE_PATH ?? "./data/airm.db";
  const dbDir = dirname(resolve(dbPath));
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 10000");

  _db = drizzle(sqlite, { schema });
  return _db;
}

// Proxy that lazily initializes the database on first property access.
// This preserves the `db.select()`, `db.insert()`, etc. API without
// requiring changes to any consuming code.
export const db: BetterSQLite3Database<typeof schema> = new Proxy(
  {} as BetterSQLite3Database<typeof schema>,
  {
    get(_target, prop, receiver) {
      const realDb = getDb();
      const value = Reflect.get(realDb, prop, receiver);
      if (typeof value === "function") {
        return value.bind(realDb);
      }
      return value;
    },
  }
);
