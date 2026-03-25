import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export function getSetting(key: string): string | null {
  const row = db
    .select({ value: schema.systemSettings.value })
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.key, key))
    .get();
  return row?.value ?? null;
}

export function setSetting(key: string, value: string, updatedBy: string): void {
  const existing = db
    .select()
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.key, key))
    .get();

  if (existing) {
    db.update(schema.systemSettings)
      .set({ value, updatedAt: new Date().toISOString(), updatedBy })
      .where(eq(schema.systemSettings.key, key))
      .run();
  } else {
    db.insert(schema.systemSettings)
      .values({ key, value, updatedBy })
      .run();
  }
}

export function getAllSettings(): Record<string, string> {
  const rows = db.select().from(schema.systemSettings).all();
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function getSettingsBatch(keys: string[]): Record<string, string> {
  const all = getAllSettings();
  const result: Record<string, string> = {};
  for (const key of keys) {
    if (key in all) {
      result[key] = all[key];
    }
  }
  return result;
}

/** Get project display name — used in sidebar and titles */
export function getProjectName(): string {
  return getSetting("project.name") || "Provisum";
}

/** Get source system name */
export function getSourceSystemName(): string {
  return getSetting("project.sourceSystem") || "Source System";
}

/** Get target system name */
export function getTargetSystemName(): string {
  return getSetting("project.targetSystem") || "Target System";
}
