/**
 * Database-backed rate limiter for multi-isolate deployments (Vercel).
 *
 * Uses a single SQL query with upsert semantics to atomically check
 * and increment counters. Works correctly across multiple serverless
 * isolates sharing the same Supabase Postgres database.
 */

import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Check and increment a rate limit counter.
 *
 * Uses a single atomic query:
 * 1. Delete expired entries for this key
 * 2. Upsert the counter (insert or increment)
 * 3. Return the current count
 *
 * This is safe across concurrent isolates because Postgres handles
 * the upsert atomically.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = new Date(now).toISOString();
  const windowEnd = new Date(now + windowMs).toISOString();

  try {
    // Step 1: Delete any expired entry for this key
    await db.execute(sql`
      DELETE FROM rate_limit_entries WHERE key = ${key} AND window_end <= ${windowStart}
    `);

    // Step 2: Atomic upsert — insert or increment
    const result = await db.execute(sql`
      INSERT INTO rate_limit_entries (key, count, window_start, window_end)
      VALUES (${key}, 1, ${windowStart}, ${windowEnd})
      ON CONFLICT (key)
      DO UPDATE SET count = rate_limit_entries.count + 1
      RETURNING count, window_end
    `);

    const row = result[0] as { count: number; window_end: string } | undefined;
    if (!row) {
      // Fallback: allow the request if the query returned nothing
      return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
    }

    const count = Number(row.count);
    const resetAt = new Date(row.window_end).getTime();

    if (count > limit) {
      return { allowed: false, remaining: 0, resetAt };
    }

    return { allowed: true, remaining: limit - count, resetAt };
  } catch (err) {
    // If DB is unavailable, fall through (don't block requests due to rate limiter failure)
    // Log the failure so it's visible in monitoring
    console.error("[rate-limit] DB error, failing open:", err instanceof Error ? err.message : String(err));
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
}
