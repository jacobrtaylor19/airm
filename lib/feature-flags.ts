import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  enabledForRoles: string[] | null;
  enabledForUsers: number[] | null;
  percentage: number | null;
  metadata: Record<string, unknown> | null;
}

// Cache flags in memory for 60 seconds to avoid DB hits on every check
let flagCache: Map<string, FeatureFlag> = new Map();
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000;

async function loadFlags(): Promise<Map<string, FeatureFlag>> {
  const now = Date.now();
  if (now < cacheExpiry && flagCache.size > 0) return flagCache;

  try {
    const rows = await db.select().from(schema.featureFlags);
    const map = new Map<string, FeatureFlag>();
    for (const row of rows) {
      map.set(row.key, {
        key: row.key,
        enabled: row.enabled,
        enabledForRoles: row.enabledForRoles ? JSON.parse(row.enabledForRoles) : null,
        enabledForUsers: row.enabledForUsers ? JSON.parse(row.enabledForUsers) : null,
        percentage: row.percentage,
        metadata: row.metadata ? JSON.parse(row.metadata) : null,
      });
    }
    flagCache = map;
    cacheExpiry = now + CACHE_TTL_MS;
    return map;
  } catch {
    return flagCache; // return stale cache on DB error
  }
}

/**
 * Check if a feature flag is enabled for a given user.
 * If no user is provided, checks the global enabled state only.
 */
export async function isFeatureEnabled(key: string, user?: AppUser | null): Promise<boolean> {
  const flags = await loadFlags();
  const flag = flags.get(key);
  if (!flag) return false;
  if (!flag.enabled) return false;

  // Check user-specific override
  if (flag.enabledForUsers && user) {
    if (flag.enabledForUsers.includes(user.id)) return true;
  }

  // Check role-based targeting
  if (flag.enabledForRoles) {
    if (!user) return false;
    if (!flag.enabledForRoles.includes(user.role)) return false;
  }

  // Check percentage rollout (deterministic based on user ID)
  if (flag.percentage !== null && flag.percentage < 100) {
    if (!user) return flag.percentage > 50; // no user context, use threshold
    const hash = user.id % 100;
    if (hash >= flag.percentage) return false;
  }

  return true;
}

/**
 * Get all feature flags (for admin UI).
 */
export async function getAllFeatureFlags() {
  return db.select().from(schema.featureFlags).orderBy(schema.featureFlags.key);
}

/**
 * Create or update a feature flag.
 */
export async function upsertFeatureFlag(data: {
  key: string;
  description?: string;
  enabled: boolean;
  enabledForRoles?: string[] | null;
  enabledForUsers?: number[] | null;
  percentage?: number | null;
  metadata?: Record<string, unknown> | null;
}) {
  const now = new Date().toISOString();
  const values = {
    key: data.key,
    description: data.description ?? null,
    enabled: data.enabled,
    enabledForRoles: data.enabledForRoles ? JSON.stringify(data.enabledForRoles) : null,
    enabledForUsers: data.enabledForUsers ? JSON.stringify(data.enabledForUsers) : null,
    percentage: data.percentage ?? null,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    updatedAt: now,
  };

  const [existing] = await db
    .select({ id: schema.featureFlags.id })
    .from(schema.featureFlags)
    .where(eq(schema.featureFlags.key, data.key));

  if (existing) {
    await db
      .update(schema.featureFlags)
      .set(values)
      .where(eq(schema.featureFlags.key, data.key));
  } else {
    await db.insert(schema.featureFlags).values({ ...values, createdAt: now });
  }

  // Invalidate cache
  cacheExpiry = 0;
}

/**
 * Delete a feature flag.
 */
export async function deleteFeatureFlag(key: string) {
  await db.delete(schema.featureFlags).where(eq(schema.featureFlags.key, key));
  cacheExpiry = 0;
}

/**
 * Invalidate the flag cache (useful after admin changes).
 */
export function invalidateFlagCache() {
  cacheExpiry = 0;
}
