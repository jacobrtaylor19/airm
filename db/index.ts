import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

// Allow DB path override via env var (used on Render with a persistent disk)
const dbPath = process.env.DATABASE_PATH ?? "./data/airm.db";
const dbDir = dirname(resolve(dbPath));
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 10000");

export const db = drizzle(sqlite, { schema });
