import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Check whether an organization has capacity for more users.
 * Returns allowed:true if maxUsers is null (legacy/seed orgs with no limit).
 */
export async function checkUserLimit(orgId: number): Promise<{
  allowed: boolean;
  currentCount: number;
  maxUsers: number | null;
}> {
  const [org] = await db
    .select({ maxUsers: schema.organizations.maxUsers })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);

  if (!org || org.maxUsers === null) {
    return { allowed: true, currentCount: 0, maxUsers: null };
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.appUsers)
    .where(
      and(
        eq(schema.appUsers.organizationId, orgId),
        eq(schema.appUsers.isActive, true)
      )
    );

  const currentCount = countResult?.count ?? 0;

  return {
    allowed: currentCount < org.maxUsers,
    currentCount,
    maxUsers: org.maxUsers,
  };
}

/**
 * Check whether an organization's license has expired.
 * Returns valid:true if licenseExpiresAt is null (no expiry set).
 */
export async function checkLicenseExpiry(orgId: number): Promise<{
  valid: boolean;
  expiresAt: string | null;
}> {
  const [org] = await db
    .select({ licenseExpiresAt: schema.organizations.licenseExpiresAt })
    .from(schema.organizations)
    .where(eq(schema.organizations.id, orgId))
    .limit(1);

  if (!org || !org.licenseExpiresAt) {
    return { valid: true, expiresAt: null };
  }

  const now = new Date().toISOString();
  return {
    valid: now < org.licenseExpiresAt,
    expiresAt: org.licenseExpiresAt,
  };
}
