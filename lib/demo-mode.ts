// ---------------------------------------------------------------------------
// Demo mode detection — hostname-based
//
// demo.provisum.io  → demo mode (demo pills, env switcher, lead gate, restricted uploads)
// app.provisum.io   → production mode (standard login, full functionality)
// localhost / other  → demo mode (for development)
// ---------------------------------------------------------------------------

import { headers } from "next/headers";

const DEMO_HOSTS = ["demo.provisum.io", "localhost", "127.0.0.1"];

/**
 * Server-side: detect demo mode from request hostname.
 * Call from server components and API routes.
 */
export function isDemoMode(): boolean {
  try {
    const host = headers().get("host") ?? "";
    const hostname = host.split(":")[0]; // strip port
    return DEMO_HOSTS.includes(hostname) || hostname.endsWith(".vercel.app");
  } catch {
    // headers() throws outside of request context (e.g. build time)
    return false;
  }
}

/**
 * Client-side: detect demo mode from window.location.
 * Call from client components.
 */
export function isDemoModeClient(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return DEMO_HOSTS.includes(hostname) || hostname.endsWith(".vercel.app");
}
