/**
 * Validate required environment variables at startup.
 * Called from the root layout to catch misconfiguration early.
 *
 * In production: throws on missing critical vars (fail fast).
 * In development: warns only.
 */
export function validateEnv(): void {
  const required: Record<string, string> = {
    PROVISUM_ENV: "Environment detection will default to 'development' — safety guards rely on this",
    DATABASE_URL: "Database connection will fail",
    ENCRYPTION_KEY: "Sensitive settings will be stored in plaintext",
  };

  const recommended: Record<string, string> = {
    ANTHROPIC_API_KEY: "AI features (persona generation, mapping suggestions, Lumen) will not work",
    NEXT_PUBLIC_SUPABASE_URL: "Supabase Auth will not work",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "Supabase Auth will not work",
    SUPABASE_SERVICE_ROLE_KEY: "Server-side Supabase operations will fail",
    RESEND_API_KEY: "Email notifications will be skipped",
    CRON_SECRET: "Scheduled exports cron endpoint is unprotected",
  };

  const isProd = process.env.NODE_ENV === "production";
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required vars — fatal in production
  for (const [key, msg] of Object.entries(required)) {
    if (!process.env[key]) {
      if (isProd) {
        errors.push(`${key} is not set — ${msg}`);
      } else {
        warnings.push(`${key} is not set — ${msg}`);
      }
    }
  }

  // Recommended vars — always warn
  for (const [key, msg] of Object.entries(recommended)) {
    if (!process.env[key]) {
      warnings.push(`${key} is not set — ${msg}`);
    }
  }

  if (warnings.length > 0) {
    console.warn("Environment warnings:");
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  if (errors.length > 0) {
    const errorMsg = `Missing required environment variables:\n${errors.map((e) => `  - ${e}`).join("\n")}`;
    console.error(errorMsg);
    if (isProd) {
      throw new Error(errorMsg);
    }
  }
}
