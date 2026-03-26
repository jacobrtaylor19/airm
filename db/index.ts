import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

// During Render build phase, DATABASE_PATH points to /data/airm.db but the
// persistent disk isn't mounted. Fall back to a local path for build-time
// schema operations (db:push) and page collection.
function resolveDbPath(): string {
  const envPath = process.env.DATABASE_PATH;
  if (!envPath) return "./data/airm.db";

  const dir = dirname(resolve(envPath));
  // If the target directory doesn't exist and can't be created (e.g., /data
  // on Render build), fall back to local path
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      console.warn(`⚠️  Cannot create ${dir} — falling back to ./data/airm.db (build phase?)`);
      return "./data/airm.db";
    }
  }
  return envPath;
}

const dbPath = resolveDbPath();
const dbDir = dirname(resolve(dbPath));
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 10000");

export const db = drizzle(sqlite, { schema });
