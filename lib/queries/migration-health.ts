import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, sql, eq, and } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

export interface MigrationHealthData {
  // Coverage KPIs
  totalUsers: number;
  usersWithPersona: number;
  personaCoverage: number; // percentage

  totalPersonas: number;
  personasWithMapping: number;
  mappingCoverage: number; // percentage

  totalMappings: number;
  approvedMappings: number;
  approvalRate: number; // percentage

  // SOD health
  totalSodConflicts: number;
  resolvedSodConflicts: number;
  sodResolutionRate: number; // percentage

  // Confidence distribution
  highConfidence: number; // >= 80%
  mediumConfidence: number; // 50-79%
  lowConfidence: number; // < 50%

  // Pipeline completeness
  pipelineStages: {
    stage: string;
    completed: number;
    total: number;
    percentage: number;
  }[];

  // Recent activity (last 7 days)
  recentAuditActions: number;
}

export async function getMigrationHealthData(orgId: number): Promise<MigrationHealthData> {
  // Run all queries in parallel for performance
  const [
    totalUsersResult,
    usersWithPersonaResult,
    totalPersonasResult,
    personasWithMappingResult,
    totalMappingsResult,
    approvedMappingsResult,
    totalSodResult,
    resolvedSodResult,
    confidenceResult,
    recentAuditResult,
  ] = await Promise.all([
    // Total users
    db.select({ count: count() }).from(schema.users).where(orgScope(schema.users.organizationId, orgId)),

    // Users with persona assignment
    db.select({ count: sql<number>`count(distinct ${schema.userPersonaAssignments.userId})` })
      .from(schema.userPersonaAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
      .where(orgScope(schema.users.organizationId, orgId)),

    // Total personas
    db.select({ count: count() }).from(schema.personas).where(orgScope(schema.personas.organizationId, orgId)),

    // Personas with at least one mapping
    db.select({ count: sql<number>`count(distinct ${schema.personaTargetRoleMappings.personaId})` })
      .from(schema.personaTargetRoleMappings)
      .innerJoin(schema.personas, eq(schema.personas.id, schema.personaTargetRoleMappings.personaId))
      .where(orgScope(schema.personas.organizationId, orgId)),

    // Total role assignments
    db.select({ count: count() })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(orgScope(schema.users.organizationId, orgId)),

    // Approved assignments
    db.select({ count: count() })
      .from(schema.userTargetRoleAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
      .where(and(
        orgScope(schema.users.organizationId, orgId),
        eq(schema.userTargetRoleAssignments.status, "approved"),
      )),

    // Total SOD conflicts
    db.select({ count: count() })
      .from(schema.sodConflicts)
      .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
      .where(orgScope(schema.users.organizationId, orgId)),

    // Resolved SOD conflicts
    db.select({ count: count() })
      .from(schema.sodConflicts)
      .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
      .where(and(
        orgScope(schema.users.organizationId, orgId),
        sql`${schema.sodConflicts.resolutionStatus} NOT IN ('open', 'pending_risk_acceptance')`,
      )),

    // Confidence distribution from persona assignments
    db.select({
      high: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 0.8)`,
      medium: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 0.5 and ${schema.userPersonaAssignments.confidenceScore} < 0.8)`,
      low: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} < 0.5 or ${schema.userPersonaAssignments.confidenceScore} is null)`,
    })
      .from(schema.userPersonaAssignments)
      .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
      .where(orgScope(schema.users.organizationId, orgId)),

    // Recent audit log entries (last 7 days)
    db.select({ count: count() })
      .from(schema.auditLog)
      .where(and(
        orgScope(schema.auditLog.organizationId, orgId),
        sql`${schema.auditLog.createdAt} > (now() - interval '7 days')::text`,
      )),
  ]);

  const totalUsers = totalUsersResult[0]!.count;
  const usersWithPersona = Number(usersWithPersonaResult[0]!.count);
  const totalPersonas = totalPersonasResult[0]!.count;
  const personasWithMapping = Number(personasWithMappingResult[0]!.count);
  const totalMappings = totalMappingsResult[0]!.count;
  const approvedMappings = approvedMappingsResult[0]!.count;
  const totalSodConflicts = totalSodResult[0]!.count;
  const resolvedSodConflicts = resolvedSodResult[0]!.count;
  const confidence = confidenceResult[0]!;
  const recentAuditActions = recentAuditResult[0]!.count;

  const pct = (n: number, d: number) => d === 0 ? 0 : Math.round((n / d) * 100);

  return {
    totalUsers,
    usersWithPersona,
    personaCoverage: pct(usersWithPersona, totalUsers),
    totalPersonas,
    personasWithMapping,
    mappingCoverage: pct(personasWithMapping, totalPersonas),
    totalMappings,
    approvedMappings,
    approvalRate: pct(approvedMappings, totalMappings),
    totalSodConflicts,
    resolvedSodConflicts,
    sodResolutionRate: pct(resolvedSodConflicts, totalSodConflicts),
    highConfidence: Number(confidence.high),
    mediumConfidence: Number(confidence.medium),
    lowConfidence: Number(confidence.low),
    pipelineStages: [
      { stage: "User Upload", completed: totalUsers, total: totalUsers, percentage: totalUsers > 0 ? 100 : 0 },
      { stage: "Persona Assignment", completed: usersWithPersona, total: totalUsers, percentage: pct(usersWithPersona, totalUsers) },
      { stage: "Role Mapping", completed: personasWithMapping, total: totalPersonas, percentage: pct(personasWithMapping, totalPersonas) },
      { stage: "SOD Analysis", completed: resolvedSodConflicts, total: totalSodConflicts, percentage: pct(resolvedSodConflicts, totalSodConflicts) },
      { stage: "Approval", completed: approvedMappings, total: totalMappings, percentage: pct(approvedMappings, totalMappings) },
    ],
    recentAuditActions,
  };
}
