import { defineConfig } from "drizzle-kit";
import { existsSync } from "fs";
import { dirname, resolve } from "path";

// During Render build, DATABASE_PATH=/data/airm.db but /data doesn't exist
// (persistent disk only mounts at runtime). Fall back to local path.
function resolveDbUrl(): string {
  const envPath = process.env.DATABASE_PATH;
  if (!envPath) return "./data/airm.db";

  const dir = dirname(resolve(envPath));
  if (!existsSync(dir)) {
    return "./data/airm.db";
  }
  return envPath;
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: resolveDbUrl(),
  },
});
