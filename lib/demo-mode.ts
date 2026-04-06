// ---------------------------------------------------------------------------
// Demo / Sandbox / Production mode detection
//
// Primary: PROVISUM_ENV env var (set in Vercel per environment)
// Fallback: hostname-based detection (backward compat)
//
// Environments:
//   production  → clean customer app (no demo features)
//   demo        → pre-loaded demo (lead gate, persona pills, uploads disabled)
//   sandbox     → blank env (persona pills, uploads ENABLED, no lead gate)
//   preview     → PR review (behaves like demo)
//   development → local dev (behaves like demo)
// ---------------------------------------------------------------------------

import { headers } from "next/headers";
import { getProvisumEnv, getProvisumEnvClient } from "@/lib/env";

const PROD_HOSTS = ["app.provisum.io"];
const DEMO_HOSTS = ["demo.provisum.io"];
const SANDBOX_HOSTS = ["sandbox.provisum.io"];

/**
 * Server-side: returns true when persona pills, demo reset, and demo-like
 * behavior should be active. True for: demo, sandbox, preview, development.
 */
export function isDemoMode(): boolean {
  const env = getProvisumEnv();
  if (env === "production") return false;
  if (env === "demo" || env === "sandbox") return true;

  // For development/preview, check hostname as tiebreaker
  try {
    const host = headers().get("host") ?? "";
    const hostname = host.split(":")[0];
    if (PROD_HOSTS.includes(hostname)) return false;
    return true;
  } catch {
    return true;
  }
}

/**
 * Client-side: same logic as isDemoMode() but uses window.location.
 */
export function isDemoModeClient(): boolean {
  const env = getProvisumEnvClient();
  if (env === "production") return false;
  if (env === "demo" || env === "sandbox") return true;

  if (typeof window === "undefined") return true;
  const hostname = window.location.hostname;
  if (PROD_HOSTS.includes(hostname)) return false;
  return true;
}

/**
 * Server-side: returns true when the demo lead gate should be shown.
 * Only true for the demo environment — sandbox skips the gate.
 */
export function isDemoGateActive(): boolean {
  const env = getProvisumEnv();
  if (env === "demo") return true;

  // Hostname fallback
  try {
    const host = headers().get("host") ?? "";
    const hostname = host.split(":")[0];
    return DEMO_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}

/**
 * Server-side: returns true when uploads should be blocked.
 * Uploads are disabled in demo (pre-loaded data shouldn't be overwritten).
 * Uploads are enabled in sandbox (prospects try with their own data),
 * production, and development.
 */
export function isUploadDisabled(): boolean {
  const env = getProvisumEnv();
  return env === "demo";
}

/**
 * Server-side: returns true for sandbox environment.
 */
export function isSandboxMode(): boolean {
  const env = getProvisumEnv();
  if (env === "sandbox") return true;

  try {
    const host = headers().get("host") ?? "";
    const hostname = host.split(":")[0];
    return SANDBOX_HOSTS.includes(hostname);
  } catch {
    return false;
  }
}
