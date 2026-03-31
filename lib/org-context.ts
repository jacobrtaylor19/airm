/**
 * Organization context helpers for multi-tenant isolation.
 *
 * Every query that reads or writes top-level entity data should be scoped
 * to the user's organization. This module provides helpers to resolve and
 * apply org context consistently.
 *
 * Phase 1 (complete): organization_id columns added as nullable.
 * Phase 2 (complete): All queries use orgScope()/withOrgFilter().
 * Phase 3 (current):  organization_id is NOT NULL on all entity tables.
 *                     Queries use simple equality — no IS NULL fallback.
 */

import { eq, sql, type Column } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";

/**
 * Get the organization ID for the current user.
 * Organization must always be set — throws if missing.
 */
export function getOrgId(user: AppUser): number {
  if (user.organizationId == null) {
    throw new Error("User has no organizationId — cannot scope query");
  }
  return user.organizationId;
}

/**
 * Build a SQL condition for org scoping.
 * Use this in `.where()` clauses to filter by organization.
 *
 * Example:
 * ```ts
 * const orgId = getOrgId(user);
 * const rows = await db.select().from(schema.users)
 *   .where(and(orgScope(schema.users.organizationId, orgId), ...otherConditions));
 * ```
 */
export function orgScope(orgIdColumn: Column, orgId: number) {
  return eq(orgIdColumn, orgId);
}

/**
 * Simplified org scope that works with raw SQL fragments.
 * Matches rows where organization_id equals the given org.
 */
export function withOrgFilter(orgId: number) {
  return sql`organization_id = ${orgId}`;
}

/**
 * Get the org ID to set when creating new records.
 * Always returns a concrete number (never null) for new data.
 */
export function getOrgIdForInsert(user: AppUser): number {
  if (user.organizationId == null) {
    throw new Error("User has no organizationId — cannot insert org-scoped record");
  }
  return user.organizationId;
}
