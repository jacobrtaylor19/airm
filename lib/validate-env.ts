/**
 * Validate required environment variables at startup.
 * Called from the root layout to catch misconfiguration early.
 */
export function validateEnv(): void {
  const warnings: string[] = [];

  if (process.env.NODE_ENV === "production") {
    if (!process.env.ENCRYPTION_KEY) {
      warnings.push("ENCRYPTION_KEY is not set — sensitive settings will be stored in plaintext");
    }
    if (!process.env.DATABASE_PATH) {
      warnings.push("DATABASE_PATH is not set — using default ./data/airm.db (may not persist on cloud platforms)");
    }
  }

  if (warnings.length > 0) {
    console.warn("⚠️  Environment warnings:");
    warnings.forEach(w => console.warn(`   - ${w}`));
  }
}
