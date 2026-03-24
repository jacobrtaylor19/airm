import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";

// Ensure data directory exists
if (!existsSync("./data")) {
  mkdirSync("./data", { recursive: true });
}

const sqlite = new Database("./data/airm.db");
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 10000");

export const db = drizzle(sqlite, { schema });
