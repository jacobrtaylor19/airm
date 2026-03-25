import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt, isEncrypted, isSensitiveKey } from "@/lib/encryption";

/**
 * Check if encryption is available (ENCRYPTION_KEY is set).
 * Settings work without encryption in dev if key is not configured.
 */
function encryptionAvailable(): boolean {
  return !!process.env.ENCRYPTION_KEY;
}

export function getSetting(key: string): string | null {
  const row = db
    .select({ value: schema.systemSettings.value })
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.key, key))
    .get();
  if (!row) return null;

  // Decrypt if value is encrypted
  if (isEncrypted(row.value)) {
    try {
      return decrypt(row.value);
    } catch {
      // If decryption fails (wrong key, corrupted), return null rather than leak ciphertext
      console.error(`Failed to decrypt setting: ${key}`);
      return null;
    }
  }

  return row.value;
}

export function setSetting(key: string, value: string, updatedBy?: string): void {
  // Encrypt sensitive settings if encryption key is available
  const storedValue =
    encryptionAvailable() && isSensitiveKey(key) ? encrypt(value) : value;

  const existing = db
    .select()
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.key, key))
    .get();

  if (existing) {
    db.update(schema.systemSettings)
      .set({ value: storedValue, updatedAt: new Date().toISOString(), updatedBy })
      .where(eq(schema.systemSettings.key, key))
      .run();
  } else {
    db.insert(schema.systemSettings)
      .values({ key, value: storedValue, updatedBy })
      .run();
  }
}

export function getAllSettings(): Record<string, string> {
  const rows = db.select().from(schema.systemSettings).all();
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (isEncrypted(row.value)) {
      try {
        result[row.key] = decrypt(row.value);
      } catch {
        // Skip settings that can't be decrypted
        result[row.key] = "••••••••";
      }
    } else {
      result[row.key] = row.value;
    }
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

/**
 * Migrate all plaintext sensitive settings to encrypted form.
 * Safe to call multiple times — skips already-encrypted values.
 */
export function migrateSettings(): void {
  if (!encryptionAvailable()) return;

  const rows = db.select().from(schema.systemSettings).all();
  for (const row of rows) {
    if (isSensitiveKey(row.key) && !isEncrypted(row.value)) {
      const encrypted = encrypt(row.value);
      db.update(schema.systemSettings)
        .set({ value: encrypted, updatedAt: new Date().toISOString() })
        .where(eq(schema.systemSettings.key, row.key))
        .run();
    }
  }
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
