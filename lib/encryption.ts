import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be exactly 32 bytes (base64-encoded). Current length: " + key.length
    );
  }
  return key;
}

/**
 * Get the previous encryption key for key rotation.
 * Returns null if ENCRYPTION_KEY_PREVIOUS is not set.
 */
function getPreviousEncryptionKey(): Buffer | null {
  const keyBase64 = process.env.ENCRYPTION_KEY_PREVIOUS;
  if (!keyBase64) return null;
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY_PREVIOUS must be exactly 32 bytes (base64-encoded). Current length: " + key.length
    );
  }
  return key;
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns a string in the format: iv:authTag:ciphertext (all base64-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypt a ciphertext using a specific key. Returns the plaintext or throws.
 */
function decryptWithKey(encrypted: string, key: Buffer): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted value format");
  }

  const [ivBase64, authTagBase64, ciphertext] = parts;
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if an error is a GCM authentication failure (wrong key or tampered data).
 */
function isGcmAuthError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Node.js crypto throws with code ERR_OSSL_EVP_UNABLE_TO_GET_TAG or similar,
  // and the message contains "Unsupported state" or "unable to authenticate"
  const msg = err.message.toLowerCase();
  return (
    msg.includes("unsupported state") ||
    msg.includes("unable to authenticate") ||
    msg.includes("bad decrypt")
  );
}

/**
 * Decrypt a value encrypted with encrypt().
 * Tries the current key first. If ENCRYPTION_KEY_PREVIOUS is set and the
 * current key fails with a GCM auth error, falls back to the previous key.
 * Throws on tamper or if neither key works.
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  try {
    return decryptWithKey(encrypted, key);
  } catch (err) {
    // Only fall back for GCM authentication failures (wrong key),
    // not for format errors or other issues
    if (!isGcmAuthError(err)) throw err;

    const previousKey = getPreviousEncryptionKey();
    if (!previousKey) throw err;

    // Try previous key — if this also fails, let it throw
    return decryptWithKey(encrypted, previousKey);
  }
}

/**
 * Attempt to re-encrypt a value from the previous key to the current key.
 * Returns the new ciphertext if re-encryption was needed, or null if the
 * value is already encrypted with the current key.
 * Throws if neither key can decrypt the value.
 */
export function reEncryptValue(encrypted: string): string | null {
  const currentKey = getEncryptionKey();

  // Try current key first — if it works, no rotation needed
  try {
    decryptWithKey(encrypted, currentKey);
    return null;
  } catch (err) {
    if (!isGcmAuthError(err)) throw err;
  }

  // Try previous key
  const previousKey = getPreviousEncryptionKey();
  if (!previousKey) {
    throw new Error("Cannot re-encrypt: value not decryptable with current key and no previous key configured");
  }

  const plaintext = decryptWithKey(encrypted, previousKey);
  // Re-encrypt with current key
  return encrypt(plaintext);
}

/**
 * Check if a value matches the encrypted format (iv:authTag:ciphertext, all base64).
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  if (parts.length !== 3) return false;

  const [ivBase64, authTagBase64] = parts;

  try {
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    // Verify the base64 roundtrips correctly (not arbitrary strings with colons)
    if (iv.toString("base64") !== ivBase64) return false;
    if (authTag.toString("base64") !== authTagBase64) return false;
    return iv.length === IV_LENGTH && authTag.length === AUTH_TAG_LENGTH;
  } catch {
    return false;
  }
}

/**
 * List of setting keys whose values should be encrypted at rest.
 * Non-sensitive settings (project names, thresholds) are stored in plaintext.
 */
const SENSITIVE_KEYS = new Set([
  "anthropic_api_key",
  "api_key",
  "secret",
  "password",
  "token",
]);

/**
 * Determine if a setting key should be encrypted based on its name.
 */
export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return Array.from(SENSITIVE_KEYS).some(
    (pattern) => lower.includes(pattern)
  );
}

/**
 * Rotate all encrypted settings from the previous encryption key to the current key.
 * Requires ENCRYPTION_KEY_PREVIOUS to be set.
 * Returns counts of rotated, skipped, and total encrypted settings.
 */
export async function rotateAllSettings(): Promise<{
  rotated: number;
  skipped: number;
  total: number;
}> {
  // Lazy import to avoid circular dependency (settings imports from encryption)
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const rows = await db.select().from(schema.systemSettings);
  let rotated = 0;
  let skipped = 0;
  let total = 0;

  for (const row of rows) {
    if (!isEncrypted(row.value)) continue;
    total++;

    const reEncrypted = reEncryptValue(row.value);
    if (reEncrypted === null) {
      // Already on current key
      skipped++;
    } else {
      await db
        .update(schema.systemSettings)
        .set({ value: reEncrypted, updatedAt: new Date().toISOString() })
        .where(eq(schema.systemSettings.key, row.key));
      rotated++;
    }
  }

  return { rotated, skipped, total };
}
