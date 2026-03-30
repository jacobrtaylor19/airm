/**
 * Organization context helpers for multi-tenant isolation.
 *
 * Every query that reads or writes top-level entity data should be scoped
 * to the user's organization. This module provides helpers to resolve and
 * apply org context consistently.
 *
 * Migration strategy:
 * - Phase 1 (current): organization_id columns added as nullable.
 *   Existing data defaults to org 1. Queries optionally filter by org.
 * - Phase 2: All queries use withOrgScope(). organization_id becomes NOT NULL.
 * - Phase 3: RLS policies enforce isolation at the DB level as a safety net.
 */

import { sql, type Column } from "drizzle-orm";
import type { AppUser } from "@/lib/auth";

/**
 * Get the organization ID for the current user.
 * Returns 1 as fallback for users without an org assignment (backward compat).
 */
export function getOrgId(user: AppUser): number {
  return user.organizationId ?? 1;
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
  return sql`${orgIdColumn} = ${orgId} OR ${orgIdColumn} IS NULL`;
}

/**
 * Simplified org scope that works with any Drizzle column reference.
 * Matches rows where organization_id equals the given org OR is NULL
 * (backward compat for un-migrated rows).
 */
export function withOrgFilter(orgId: number) {
  return sql`(organization_id = ${orgId} OR organization_id IS NULL)`;
}

/**
 * Get the org ID to set when creating new records.
 * Always returns a concrete number (never null) for new data.
 */
export function getOrgIdForInsert(user: AppUser): number {
  return user.organizationId ?? 1;
}
