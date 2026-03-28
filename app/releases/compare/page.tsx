import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, sql, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { CompareClient } from "./compare-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_ROLES = ["system_admin", "admin", "project_manager"];

export interface ReleaseMetrics {
  id: number;
  name: string;
  status: string;
  totalUsersInScope: number;
  personasGenerated: number;
  personasMappedPct: number;
  assignmentsApprovedPct: number;
  sodConflictsBySeverity: { severity: string; count: number }[];
  topUnmappedPersonas: string[];
}

async function getReleaseMetrics(releaseId: number): Promise<ReleaseMetrics | null> {
  const [release] = await db
    .select()
    .from(schema.releases)
    .where(eq(schema.releases.id, releaseId));
  if (!release) return null;

  // Total users in scope
  const totalUsersInScope = (await db
    .select({ count: count() })
    .from(schema.releaseUsers)
    .where(eq(schema.releaseUsers.releaseId, releaseId)))[0]!.count;

  // Get user IDs in this release for persona queries
  const releaseUserIds = (await db
    .select({ userId: schema.releaseUsers.userId })
    .from(schema.releaseUsers)
    .where(eq(schema.releaseUsers.releaseId, releaseId)))
    .map((r) => r.userId);

  // Personas generated (distinct personas assigned to users in this release)
  let personasGenerated = 0;
  if (releaseUserIds.length > 0) {
    personasGenerated = Number((await db
      .select({ count: sql<number>`count(distinct ${schema.userPersonaAssignments.personaId})` })
      .from(schema.userPersonaAssignments)
      .where(inArray(schema.userPersonaAssignments.userId, releaseUserIds)))[0]!.count);
  }

  // Total personas known
  const totalPersonas = (await db.select({ count: count() }).from(schema.personas))[0]!.count;

  // Personas mapped (have at least one target role mapping)
  const personasMapped = Number((await db
    .select({ count: sql<number>`count(distinct ${schema.personaTargetRoleMappings.personaId})` })
    .from(schema.personaTargetRoleMappings))[0]!.count);

  const personasMappedPct = totalPersonas > 0 ? Math.round((personasMapped / totalPersonas) * 100) : 0;

  // Assignments approved %
  const totalAssignments = (await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.releaseId, releaseId)))[0]!.count;

  const approvedAssignments = (await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(
      sql`${schema.userTargetRoleAssignments.releaseId} = ${releaseId} AND ${schema.userTargetRoleAssignments.status} = 'approved'`
    ))[0]!.count;

  const assignmentsApprovedPct = totalAssignments > 0 ? Math.round((approvedAssignments / totalAssignments) * 100) : 0;

  // SOD conflicts by severity for users in this release
  let sodConflictsBySeverity: { severity: string; count: number }[] = [];
  if (releaseUserIds.length > 0) {
    sodConflictsBySeverity = await db
      .select({
        severity: schema.sodConflicts.severity,
        count: count(),
      })
      .from(schema.sodConflicts)
      .where(inArray(schema.sodConflicts.userId, releaseUserIds))
      .groupBy(schema.sodConflicts.severity);
  }

  // Top 5 unmapped personas (personas with no target role mapping)
  const unmappedPersonas = (await db
    .select({ name: schema.personas.name })
    .from(schema.personas)
    .where(
      sql`${schema.personas.id} NOT IN (SELECT DISTINCT persona_id FROM persona_target_role_mappings)`
    )
    .limit(5))
    .map((p) => p.name);

  return {
    id: release.id,
    name: release.name,
    status: release.status,
    totalUsersInScope,
    personasGenerated,
    personasMappedPct,
    assignmentsApprovedPct,
    sodConflictsBySeverity,
    topUnmappedPersonas: unmappedPersonas,
  };
}

export default async function ReleaseComparePage() {
  await requireRole(ALLOWED_ROLES);

  const allReleases = await db
    .select({ id: schema.releases.id, name: schema.releases.name, status: schema.releases.status })
    .from(schema.releases)
    .orderBy(schema.releases.createdAt);

  // Pre-compute metrics for all releases (manageable count in practice)
  const metricsMap: Record<number, ReleaseMetrics> = {};
  for (const r of allReleases) {
    const m = await getReleaseMetrics(r.id);
    if (m) metricsMap[r.id] = m;
  }

  return (
    <CompareClient
      releases={allReleases}
      metricsMap={metricsMap}
    />
  );
}
