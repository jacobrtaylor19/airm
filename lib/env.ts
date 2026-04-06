/**
 * Environment detection for Provisum.
 *
 * Uses PROVISUM_ENV env var as the primary signal.
 * Valid values: production, demo, preview, development
 *
 * Set in Vercel:
 *   Production env vars → PROVISUM_ENV=production
 *   Preview env vars    → PROVISUM_ENV=demo (or preview for PR branches)
 * Set locally:
 *   .env.local → PROVISUM_ENV=development
 */

export type ProvisumEnv = "production" | "demo" | "sandbox" | "preview" | "development";

const VALID_ENVS: ProvisumEnv[] = ["production", "demo", "sandbox", "preview", "development"];

export function getProvisumEnv(): ProvisumEnv {
  const env = process.env.PROVISUM_ENV as ProvisumEnv | undefined;
  if (env && VALID_ENVS.includes(env)) return env;
  return "development";
}

export function isProduction(): boolean {
  return getProvisumEnv() === "production";
}

export function isDemoEnv(): boolean {
  return getProvisumEnv() === "demo";
}

export function isPreviewEnv(): boolean {
  return getProvisumEnv() === "preview";
}

/**
 * Client-side environment detection.
 * Uses NEXT_PUBLIC_PROVISUM_ENV (exposed to browser by Next.js).
 */
export function getProvisumEnvClient(): ProvisumEnv {
  const env = (typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_PROVISUM_ENV
    : process.env.PROVISUM_ENV) as ProvisumEnv | undefined;
  if (env && VALID_ENVS.includes(env)) return env;
  return "development";
}
