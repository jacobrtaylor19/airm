import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, sql, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth";
import { CompareClient } from "./compare-client";

export const dynamic = "force-dynamic";

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

function getReleaseMetrics(releaseId: number): ReleaseMetrics | null {
  const release = db
    .select()
    .from(schema.releases)
    .where(eq(schema.releases.id, releaseId))
    .get();
  if (!release) return null;

  // Total users in scope
  const totalUsersInScope = db
    .select({ count: count() })
    .from(schema.releaseUsers)
    .where(eq(schema.releaseUsers.releaseId, releaseId))
    .get()!.count;

  // Get user IDs in this release for persona queries
  const releaseUserIds = db
    .select({ userId: schema.releaseUsers.userId })
    .from(schema.releaseUsers)
    .where(eq(schema.releaseUsers.releaseId, releaseId))
    .all()
    .map((r) => r.userId);

  // Personas generated (distinct personas assigned to users in this release)
  let personasGenerated = 0;
  if (releaseUserIds.length > 0) {
    personasGenerated = db
      .select({ count: sql<number>`count(distinct ${schema.userPersonaAssignments.personaId})` })
      .from(schema.userPersonaAssignments)
      .where(inArray(schema.userPersonaAssignments.userId, releaseUserIds))
      .get()!.count;
  }

  // Total personas known
  const totalPersonas = db.select({ count: count() }).from(schema.personas).get()!.count;

  // Personas mapped (have at least one target role mapping)
  const personasMapped = db
    .select({ count: sql<number>`count(distinct ${schema.personaTargetRoleMappings.personaId})` })
    .from(schema.personaTargetRoleMappings)
    .get()!.count;

  const personasMappedPct = totalPersonas > 0 ? Math.round((personasMapped / totalPersonas) * 100) : 0;

  // Assignments approved %
  const totalAssignments = db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.releaseId, releaseId))
    .get()!.count;

  const approvedAssignments = db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(
      sql`${schema.userTargetRoleAssignments.releaseId} = ${releaseId} AND ${schema.userTargetRoleAssignments.status} = 'approved'`
    )
    .get()!.count;

  const assignmentsApprovedPct = totalAssignments > 0 ? Math.round((approvedAssignments / totalAssignments) * 100) : 0;

  // SOD conflicts by severity for users in this release
  let sodConflictsBySeverity: { severity: string; count: number }[] = [];
  if (releaseUserIds.length > 0) {
    sodConflictsBySeverity = db
      .select({
        severity: schema.sodConflicts.severity,
        count: count(),
      })
      .from(schema.sodConflicts)
      .where(inArray(schema.sodConflicts.userId, releaseUserIds))
      .groupBy(schema.sodConflicts.severity)
      .all();
  }

  // Top 5 unmapped personas (personas with no target role mapping)
  const unmappedPersonas = db
    .select({ name: schema.personas.name })
    .from(schema.personas)
    .where(
      sql`${schema.personas.id} NOT IN (SELECT DISTINCT persona_id FROM persona_target_role_mappings)`
    )
    .limit(5)
    .all()
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

export default function ReleaseComparePage() {
  requireRole(ALLOWED_ROLES);

  const allReleases = db
    .select({ id: schema.releases.id, name: schema.releases.name, status: schema.releases.status })
    .from(schema.releases)
    .orderBy(schema.releases.createdAt)
    .all();

  // Pre-compute metrics for all releases (manageable count in practice)
  const metricsMap: Record<number, ReleaseMetrics> = {};
  for (const r of allReleases) {
    const m = getReleaseMetrics(r.id);
    if (m) metricsMap[r.id] = m;
  }

  return (
    <CompareClient
      releases={allReleases}
      metricsMap={metricsMap}
    />
  );
}
