/**
 * In-memory IP-based rate limiter using a sliding window.
 *
 * Complements the DB-backed rate limiter (`lib/rate-limit.ts`) for cases
 * where a lightweight, zero-latency check is preferred — e.g., protecting
 * public-facing form endpoints from spam without a database round-trip.
 *
 * Note: In-memory state is per-isolate on Vercel. A determined attacker
 * hitting different isolates could exceed the limit across the fleet. For
 * critical auth endpoints, combine with the DB-backed limiter. For form
 * spam prevention this is more than sufficient.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

/** Interval for purging expired entries (every 60 seconds) */
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

/**
 * Purge entries whose most recent request is older than the longest
 * reasonable window (5 minutes). Runs at most once per CLEANUP_INTERVAL_MS.
 */
function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const staleThreshold = now - 5 * 60_000;
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < staleThreshold) {
      store.delete(key);
    }
  });
}

export interface RateLimitOptions {
  /** Time window in milliseconds (default: 60_000 = 1 minute) */
  windowMs?: number;
  /** Maximum requests allowed within the window (default: 100) */
  maxRequests?: number;
  /** Override the key used for tracking. If omitted, the client IP is used. */
  identifier?: string;
}

export interface RateLimitResult {
  /** Whether the request should be allowed */
  success: boolean;
  /** How many requests remain in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

/** Default presets */
export const RATE_LIMIT_PRESETS = {
  /** General API: 100 req / 60s */
  GENERAL: { windowMs: 60_000, maxRequests: 100 } as const,
  /** Auth endpoints: 10 req / 60s */
  AUTH: { windowMs: 60_000, maxRequests: 10 } as const,
  /** Contact / form endpoints: 5 req / 60s */
  FORM: { windowMs: 60_000, maxRequests: 5 } as const,
} as const;

/**
 * Check (and record) a rate limit hit for the given identifier.
 *
 * Uses a sliding window: only timestamps within `[now - windowMs, now]`
 * are counted.
 */
export function checkRateLimit(opts: RateLimitOptions = {}): RateLimitResult {
  const { windowMs = 60_000, maxRequests = 100, identifier = "global" } = opts;
  const now = Date.now();

  cleanupIfNeeded();

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Slide the window — keep only timestamps within [now - windowMs, now]
  const windowStart = now - windowMs;
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  // Record this request
  entry.timestamps.push(now);

  const count = entry.timestamps.length;
  const resetAt = entry.timestamps.length > 0 ? entry.timestamps[0] + windowMs : now + windowMs;

  if (count > maxRequests) {
    return { success: false, remaining: 0, resetAt };
  }

  return { success: true, remaining: maxRequests - count, resetAt };
}

/**
 * Extract the client IP from standard proxy headers.
 * On Vercel, `x-forwarded-for` is always set by the edge network.
 * Falls back to `x-real-ip`, then "unknown".
 */
export function getClientIp(headerGet: (name: string) => string | null): string {
  const forwarded = headerGet("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headerGet("x-real-ip") ?? "unknown";
}
