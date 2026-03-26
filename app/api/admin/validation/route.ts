import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, sql, isNotNull } from "drizzle-orm";
import { getSessionUserFromToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { AUTH } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = cookies().get(AUTH.COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = getSessionUserFromToken(token);
  if (!user || user.role !== "system_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ─────────────────────────────────────────────
  // 1. Core counts
  // ─────────────────────────────────────────────
  const totalUsers = db.select({ count: count() }).from(schema.users).get()!.count;
  const totalPersonas = db.select({ count: count() }).from(schema.personas).get()!.count;
  const totalTargetRoles = db.select({ count: count() }).from(schema.targetRoles).get()!.count;
  const totalAssignments = db.select({ count: count() }).from(schema.userTargetRoleAssignments).get()!.count;
  const totalSodConflicts = db.select({ count: count() }).from(schema.sodConflicts).get()!.count;

  const usersWithPersona = db.select({ count: count() })
    .from(schema.userPersonaAssignments)
    .where(isNotNull(schema.userPersonaAssignments.personaId))
    .get()!.count;

  const usersWithoutPersona = totalUsers - usersWithPersona;

  // ─────────────────────────────────────────────
  // 2. Persona distribution
  // ─────────────────────────────────────────────
  const personaDistribution = db
    .select({
      personaId: schema.userPersonaAssignments.personaId,
      personaName: schema.personas.name,
      businessFunction: schema.personas.businessFunction,
      userCount: count(),
      avgConfidence: sql<number>`avg(${schema.userPersonaAssignments.confidenceScore})`,
      minConfidence: sql<number>`min(${schema.userPersonaAssignments.confidenceScore})`,
      maxConfidence: sql<number>`max(${schema.userPersonaAssignments.confidenceScore})`,
    })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.personas, eq(schema.userPersonaAssignments.personaId, schema.personas.id))
    .groupBy(schema.userPersonaAssignments.personaId)
    .orderBy(sql`count(*) desc`)
    .all();

  // ─────────────────────────────────────────────
  // 3. Assignment status breakdown
  // ─────────────────────────────────────────────
  const statusBreakdown = db
    .select({
      status: schema.userTargetRoleAssignments.status,
      count: count(),
    })
    .from(schema.userTargetRoleAssignments)
    .groupBy(schema.userTargetRoleAssignments.status)
    .all();

  // ─────────────────────────────────────────────
  // 4. Confidence distribution (buckets)
  // ─────────────────────────────────────────────
  const confidenceBuckets = db.all(sql`
    SELECT
      CASE
        WHEN confidence_score >= 90 THEN '90-100'
        WHEN confidence_score >= 80 THEN '80-89'
        WHEN confidence_score >= 70 THEN '70-79'
        WHEN confidence_score >= 60 THEN '60-69'
        WHEN confidence_score >= 50 THEN '50-59'
        ELSE 'Below 50'
      END as bucket,
      count(*) as count
    FROM user_persona_assignments
    WHERE confidence_score IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket DESC
  `);

  // ─────────────────────────────────────────────
  // 5. Full attribution chain (all users)
  // ─────────────────────────────────────────────
  const fullChain = db
    .select({
      userId: schema.users.id,
      sourceUserId: schema.users.sourceUserId,
      displayName: schema.users.displayName,
      department: schema.users.department,
      jobTitle: schema.users.jobTitle,
      orgUnit: schema.users.orgUnit,
      personaId: schema.userPersonaAssignments.personaId,
      personaName: schema.personas.name,
      personaBusinessFunction: schema.personas.businessFunction,
      confidenceScore: schema.userPersonaAssignments.confidenceScore,
      aiReasoning: schema.userPersonaAssignments.aiReasoning,
      assignmentMethod: schema.userPersonaAssignments.assignmentMethod,
      consolidatedGroupName: schema.consolidatedGroups.name,
    })
    .from(schema.users)
    .leftJoin(schema.userPersonaAssignments, eq(schema.users.id, schema.userPersonaAssignments.userId))
    .leftJoin(schema.personas, eq(schema.userPersonaAssignments.personaId, schema.personas.id))
    .leftJoin(schema.consolidatedGroups, eq(schema.userPersonaAssignments.consolidatedGroupId, schema.consolidatedGroups.id))
    .all();

  // ─────────────────────────────────────────────
  // 6. Role assignments per user (for chain)
  // ─────────────────────────────────────────────
  const roleAssignments = db
    .select({
      userId: schema.userTargetRoleAssignments.userId,
      targetRoleId: schema.userTargetRoleAssignments.targetRoleId,
      targetRoleName: schema.targetRoles.roleName,
      targetRoleDomain: schema.targetRoles.domain,
      status: schema.userTargetRoleAssignments.status,
      assignmentType: schema.userTargetRoleAssignments.assignmentType,
      derivedFromPersonaId: schema.userTargetRoleAssignments.derivedFromPersonaId,
      sodConflictCount: schema.userTargetRoleAssignments.sodConflictCount,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.targetRoles, eq(schema.userTargetRoleAssignments.targetRoleId, schema.targetRoles.id))
    .all();

  // Group role assignments by userId
  const rolesByUser: Record<number, typeof roleAssignments> = {};
  for (const ra of roleAssignments) {
    if (!rolesByUser[ra.userId]) rolesByUser[ra.userId] = [];
    rolesByUser[ra.userId].push(ra);
  }

  // ─────────────────────────────────────────────
  // 7. SOD conflicts per user
  // ─────────────────────────────────────────────
  const sodByUser = db
    .select({
      userId: schema.sodConflicts.userId,
      conflictCount: count(),
    })
    .from(schema.sodConflicts)
    .groupBy(schema.sodConflicts.userId)
    .all();

  const sodMap: Record<number, number> = {};
  for (const s of sodByUser) {
    sodMap[s.userId] = s.conflictCount;
  }

  // ─────────────────────────────────────────────
  // 8. Source role count per user
  // ─────────────────────────────────────────────
  const sourceRoleCounts = db
    .select({
      userId: schema.userSourceRoleAssignments.userId,
      roleCount: count(),
    })
    .from(schema.userSourceRoleAssignments)
    .groupBy(schema.userSourceRoleAssignments.userId)
    .all();

  const sourceRoleMap: Record<number, number> = {};
  for (const s of sourceRoleCounts) {
    sourceRoleMap[s.userId] = s.roleCount;
  }

  // ─────────────────────────────────────────────
  // 9. Persona → target role mappings
  // ─────────────────────────────────────────────
  const personaRoleMappings = db
    .select({
      personaId: schema.personaTargetRoleMappings.personaId,
      personaName: schema.personas.name,
      targetRoleId: schema.personaTargetRoleMappings.targetRoleId,
      targetRoleName: schema.targetRoles.roleName,
      mappingReason: schema.personaTargetRoleMappings.mappingReason,
      confidence: schema.personaTargetRoleMappings.confidence,
      coveragePercent: schema.personaTargetRoleMappings.coveragePercent,
      excessPercent: schema.personaTargetRoleMappings.excessPercent,
    })
    .from(schema.personaTargetRoleMappings)
    .innerJoin(schema.personas, eq(schema.personaTargetRoleMappings.personaId, schema.personas.id))
    .innerJoin(schema.targetRoles, eq(schema.personaTargetRoleMappings.targetRoleId, schema.targetRoles.id))
    .all();

  // ─────────────────────────────────────────────
  // 10. Build enriched user chain
  // ─────────────────────────────────────────────
  const enrichedChain = fullChain.map((u) => ({
    ...u,
    sourceRoleCount: sourceRoleMap[u.userId] ?? 0,
    targetRoles: rolesByUser[u.userId] ?? [],
    targetRoleCount: (rolesByUser[u.userId] ?? []).length,
    sodConflictCount: sodMap[u.userId] ?? 0,
    hasPersona: !!u.personaId,
    hasTargetRoles: (rolesByUser[u.userId] ?? []).length > 0,
  }));

  // ─────────────────────────────────────────────
  // 11. Edge cases & anomalies
  // ─────────────────────────────────────────────
  const edgeCases = {
    noPersona: enrichedChain.filter((u) => !u.hasPersona).length,
    personaButNoRoles: enrichedChain.filter((u) => u.hasPersona && !u.hasTargetRoles).length,
    lowConfidence: enrichedChain.filter((u) => u.confidenceScore !== null && u.confidenceScore < 60).length,
    highSodConflicts: enrichedChain.filter((u) => u.sodConflictCount >= 3).length,
    manySourceRoles: enrichedChain.filter((u) => u.sourceRoleCount >= 10).length,
    manyTargetRoles: enrichedChain.filter((u) => u.targetRoleCount >= 8).length,
  };

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    summary: {
      totalUsers,
      totalPersonas,
      totalTargetRoles,
      totalAssignments,
      totalSodConflicts,
      usersWithPersona,
      usersWithoutPersona,
      pipelineCoverage: totalUsers > 0 ? Math.round((usersWithPersona / totalUsers) * 100) : 0,
    },
    personaDistribution,
    statusBreakdown,
    confidenceBuckets,
    edgeCases,
    personaRoleMappings,
    users: enrichedChain,
  });
}
