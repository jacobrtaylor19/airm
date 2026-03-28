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

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: schema.systemSettings.value })
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.key, key));
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

export async function setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
  // Encrypt sensitive settings if encryption key is available
  const storedValue =
    encryptionAvailable() && isSensitiveKey(key) ? encrypt(value) : value;

  const [existing] = await db
    .select()
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.key, key));

  if (existing) {
    await db.update(schema.systemSettings)
      .set({ value: storedValue, updatedAt: new Date().toISOString(), updatedBy })
      .where(eq(schema.systemSettings.key, key));
  } else {
    await db.insert(schema.systemSettings)
      .values({ key, value: storedValue, updatedBy });
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(schema.systemSettings);
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

export async function getSettingsBatch(keys: string[]): Promise<Record<string, string>> {
  const all = await getAllSettings();
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
export async function migrateSettings(): Promise<void> {
  if (!encryptionAvailable()) return;

  const rows = await db.select().from(schema.systemSettings);
  for (const row of rows) {
    if (isSensitiveKey(row.key) && !isEncrypted(row.value)) {
      const encrypted = encrypt(row.value);
      await db.update(schema.systemSettings)
        .set({ value: encrypted, updatedAt: new Date().toISOString() })
        .where(eq(schema.systemSettings.key, row.key));
    }
  }
}

/** Get project display name — used in sidebar and titles */
export async function getProjectName(): Promise<string> {
  return (await getSetting("project.name")) || "Provisum";
}

/** Get source system name */
export async function getSourceSystemName(): Promise<string> {
  return (await getSetting("project.sourceSystem")) || "Source System";
}

/** Get target system name */
export async function getTargetSystemName(): Promise<string> {
  return (await getSetting("project.targetSystem")) || "Target System";
}
