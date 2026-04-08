import { db } from "@/db";
import * as schema from "@/db/schema";
import { sql, eq, ne, and } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

export interface PersonaMappingRow {
  personaId: number;
  personaName: string;
  groupName: string | null;
  userCount: number;
  mappedRoleCount: number;
  sourcePermissionCount: number;
}

export async function getPersonaMappingWorkspace(orgId: number): Promise<PersonaMappingRow[]> {
  return await db
    .select({
      personaId: schema.personas.id,
      personaName: schema.personas.name,
      groupName: schema.consolidatedGroups.name,
      userCount: sql<number>`(
        SELECT count(*) FROM user_persona_assignments upa
        WHERE upa.persona_id = personas.id
      )`,
      mappedRoleCount: sql<number>`(
        SELECT count(*) FROM persona_target_role_mappings ptrm
        WHERE ptrm.persona_id = personas.id
      )`,
      sourcePermissionCount: sql<number>`(
        SELECT count(*) FROM persona_source_permissions psp
        WHERE psp.persona_id = personas.id
      )`,
    })
    .from(schema.personas)
    .leftJoin(schema.consolidatedGroups, eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId))
    .where(orgScope(schema.personas.organizationId, orgId));
}

export interface UserRefinementRow {
  assignmentId: number;
  userId: number;
  userName: string;
  department: string | null;
  targetRoleName: string;
  assignmentType: string;
  status: string;
  personaName: string | null;
}

export async function getUserRefinements(orgId: number): Promise<UserRefinementRow[]> {
  return await db
    .select({
      assignmentId: schema.userTargetRoleAssignments.id,
      userId: schema.userTargetRoleAssignments.userId,
      userName: schema.users.displayName,
      department: schema.users.department,
      targetRoleName: schema.targetRoles.roleName,
      assignmentType: schema.userTargetRoleAssignments.assignmentType,
      status: schema.userTargetRoleAssignments.status,
      personaName: schema.personas.name,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .leftJoin(schema.personas, eq(schema.personas.id, schema.userTargetRoleAssignments.derivedFromPersonaId))
    .where(and(ne(schema.userTargetRoleAssignments.assignmentType, "persona_default"), orgScope(schema.users.organizationId, orgId)));
}

export interface UserRefinementDetail {
  userId: number;
  userName: string;
  department: string | null;
  personaName: string | null;
  personaId: number | null;
  personaDefaultRoles: { targetRoleId: number; roleName: string; roleId: string }[];
  individualOverrides: { assignmentId: number; targetRoleId: number; roleName: string; roleId: string; assignmentType: string; status: string; releasePhase: string; personaMappingChangedAt: string | null }[];
  allAssignments: { assignmentId: number; targetRoleId: number; roleName: string; roleId: string; assignmentType: string; status: string; releasePhase: string; personaMappingChangedAt: string | null }[];
  hasPersonaCascadeFlag: boolean;
  existingAccessRoles: { assignmentId: number; targetRoleId: number; roleName: string; roleId: string }[];
}

/**
 * Gets all users who have target role assignments, including both
 * persona defaults and individual overrides for the refinements tab.
 */
export async function getUserRefinementDetails(orgId: number): Promise<UserRefinementDetail[]> {
  const assignments = await db
    .select({
      assignmentId: schema.userTargetRoleAssignments.id,
      userId: schema.userTargetRoleAssignments.userId,
      userName: schema.users.displayName,
      department: schema.users.department,
      targetRoleId: schema.userTargetRoleAssignments.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleId: schema.targetRoles.roleId,
      assignmentType: schema.userTargetRoleAssignments.assignmentType,
      status: schema.userTargetRoleAssignments.status,
      derivedFromPersonaId: schema.userTargetRoleAssignments.derivedFromPersonaId,
      releasePhase: schema.userTargetRoleAssignments.releasePhase,
      personaMappingChangedAt: schema.userTargetRoleAssignments.personaMappingChangedAt,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .where(orgScope(schema.users.organizationId, orgId));

  const personaAssignments = await db
    .select({
      userId: schema.userPersonaAssignments.userId,
      personaId: schema.userPersonaAssignments.personaId,
      personaName: schema.personas.name,
    })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.personas, eq(schema.personas.id, schema.userPersonaAssignments.personaId));

  const personaByUser = new Map(personaAssignments.map(pa => [pa.userId, pa]));

  const personaMappings = await db
    .select({
      personaId: schema.personaTargetRoleMappings.personaId,
      targetRoleId: schema.personaTargetRoleMappings.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleId: schema.targetRoles.roleId,
    })
    .from(schema.personaTargetRoleMappings)
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.personaTargetRoleMappings.targetRoleId));

  const defaultRolesByPersona = new Map<number, { targetRoleId: number; roleName: string; roleId: string }[]>();
  for (const m of personaMappings) {
    const existing = defaultRolesByPersona.get(m.personaId) || [];
    existing.push({ targetRoleId: m.targetRoleId, roleName: m.roleName, roleId: m.roleId });
    defaultRolesByPersona.set(m.personaId, existing);
  }

  const byUser = new Map<number, typeof assignments>();
  for (const a of assignments) {
    const existing = byUser.get(a.userId) || [];
    existing.push(a);
    byUser.set(a.userId, existing);
  }

  const result: UserRefinementDetail[] = [];
  for (const [userId, userAssignments] of Array.from(byUser)) {
    const first = userAssignments[0];
    const persona = personaByUser.get(userId);
    const personaDefaults = persona?.personaId ? (defaultRolesByPersona.get(persona.personaId) ?? []) : [];

    // Separate existing (previous wave) from current assignments
    const currentAssignments = userAssignments.filter(a => a.releasePhase !== "existing");
    const existingRoles = userAssignments.filter(a => a.releasePhase === "existing");

    result.push({
      userId,
      userName: first.userName,
      department: first.department,
      personaName: persona?.personaName ?? null,
      personaId: persona?.personaId ?? null,
      personaDefaultRoles: personaDefaults,
      individualOverrides: currentAssignments
        .filter(a => a.assignmentType !== "persona_default")
        .map(a => ({ assignmentId: a.assignmentId, targetRoleId: a.targetRoleId, roleName: a.roleName, roleId: a.roleId, assignmentType: a.assignmentType, status: a.status, releasePhase: a.releasePhase, personaMappingChangedAt: a.personaMappingChangedAt ?? null })),
      allAssignments: currentAssignments.map(a => ({ assignmentId: a.assignmentId, targetRoleId: a.targetRoleId, roleName: a.roleName, roleId: a.roleId, assignmentType: a.assignmentType, status: a.status, releasePhase: a.releasePhase, personaMappingChangedAt: a.personaMappingChangedAt ?? null })),
      hasPersonaCascadeFlag: currentAssignments.some(a => a.personaMappingChangedAt !== null),
      existingAccessRoles: existingRoles.map(a => ({ assignmentId: a.assignmentId, targetRoleId: a.targetRoleId, roleName: a.roleName, roleId: a.roleId })),
    });
  }

  return result;
}

export interface GapRow {
  gapId: number;
  personaId: number;
  personaName: string;
  permissionId: string;
  permissionName: string | null;
  gapType: string;
  notes: string | null;
}

export async function getGapAnalysis(orgId: number): Promise<GapRow[]> {
  return await db
    .select({
      gapId: schema.permissionGaps.id,
      personaId: schema.permissionGaps.personaId,
      personaName: schema.personas.name,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      gapType: schema.permissionGaps.gapType,
      notes: schema.permissionGaps.notes,
    })
    .from(schema.permissionGaps)
    .innerJoin(schema.personas, eq(schema.personas.id, schema.permissionGaps.personaId))
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.permissionGaps.sourcePermissionId))
    .where(orgScope(schema.personas.organizationId, orgId));
}

export interface UserGapAnalysis {
  sourcePermissions: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[];
  targetPermissions: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[];
  uncoveredPermissions: { permissionId: string; permissionName: string | null; system: string | null; sourceRoles: string[] }[];
  newPermissions: { permissionId: string; permissionName: string | null; system: string | null; targetRoles: string[] }[];
  coveragePercent: number;
}

export async function getUserGapAnalysis(userId: number): Promise<UserGapAnalysis> {
  // Get user's source permissions (via source role assignments -> source roles -> source role permissions)
  const sourceRoleAssignments = await db
    .select({
      roleId: schema.sourceRoles.id,
      roleName: schema.sourceRoles.roleName,
    })
    .from(schema.userSourceRoleAssignments)
    .innerJoin(schema.sourceRoles, eq(schema.userSourceRoleAssignments.sourceRoleId, schema.sourceRoles.id))
    .where(eq(schema.userSourceRoleAssignments.userId, userId));

  const sourcePerms: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[] = [];
  const sourcePermMap = new Map<string, string[]>(); // permId -> roleNames

  for (const role of sourceRoleAssignments) {
    const perms = await db
      .select({
        permissionId: schema.sourcePermissions.permissionId,
        permissionName: schema.sourcePermissions.permissionName,
        system: schema.sourcePermissions.system,
      })
      .from(schema.sourceRolePermissions)
      .innerJoin(schema.sourcePermissions, eq(schema.sourceRolePermissions.sourcePermissionId, schema.sourcePermissions.id))
      .where(eq(schema.sourceRolePermissions.sourceRoleId, role.roleId));

    for (const p of perms) {
      sourcePerms.push({ ...p, roleName: role.roleName });
      if (!sourcePermMap.has(p.permissionId)) sourcePermMap.set(p.permissionId, []);
      if (!sourcePermMap.get(p.permissionId)!.includes(role.roleName)) {
        sourcePermMap.get(p.permissionId)!.push(role.roleName);
      }
    }
  }

  // Get user's target permissions (via target role assignments -> target roles -> target role permissions)
  const targetRoleAssignments = await db
    .select({
      roleId: schema.targetRoles.id,
      roleName: schema.targetRoles.roleName,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.targetRoles, eq(schema.userTargetRoleAssignments.targetRoleId, schema.targetRoles.id))
    .where(eq(schema.userTargetRoleAssignments.userId, userId));

  const targetPerms: { permissionId: string; permissionName: string | null; system: string | null; roleName: string }[] = [];
  const targetPermMap = new Map<string, string[]>(); // permId -> roleNames

  for (const role of targetRoleAssignments) {
    const perms = await db
      .select({
        permissionId: schema.targetPermissions.permissionId,
        permissionName: schema.targetPermissions.permissionName,
        system: schema.targetPermissions.system,
      })
      .from(schema.targetRolePermissions)
      .innerJoin(schema.targetPermissions, eq(schema.targetRolePermissions.targetPermissionId, schema.targetPermissions.id))
      .where(eq(schema.targetRolePermissions.targetRoleId, role.roleId));

    for (const p of perms) {
      targetPerms.push({ ...p, roleName: role.roleName });
      if (!targetPermMap.has(p.permissionId)) targetPermMap.set(p.permissionId, []);
      if (!targetPermMap.get(p.permissionId)!.includes(role.roleName)) {
        targetPermMap.get(p.permissionId)!.push(role.roleName);
      }
    }
  }

  // Build normalized name sets for cross-system comparison.
  // Source/target systems use different permission IDs (e.g. FB60 vs F0717),
  // so we compare by lowercased permission name to find equivalent capabilities.
  const permKey = (name: string | null, id: string): string =>
    name ? name.toLowerCase().trim() : id;

  const sourcePermKeys = new Set<string>();
  Array.from(sourcePermMap.keys()).forEach((id) => {
    const p = sourcePerms.find(sp => sp.permissionId === id);
    sourcePermKeys.add(permKey(p?.permissionName ?? null, id));
  });

  const targetPermKeys = new Set<string>();
  Array.from(targetPermMap.keys()).forEach((id) => {
    const p = targetPerms.find(tp => tp.permissionId === id);
    targetPermKeys.add(permKey(p?.permissionName ?? null, id));
  });

  // Uncovered: source perms whose capability is not in target
  const uncovered: UserGapAnalysis["uncoveredPermissions"] = [];
  const seen = new Set<string>();
  for (const p of sourcePerms) {
    const key = permKey(p.permissionName, p.permissionId);
    if (!targetPermKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      uncovered.push({
        permissionId: p.permissionId,
        permissionName: p.permissionName,
        system: p.system,
        sourceRoles: sourcePermMap.get(p.permissionId) || [],
      });
    }
  }

  // New: target perms whose capability is not in source
  const newPerms: UserGapAnalysis["newPermissions"] = [];
  const seenNew = new Set<string>();
  for (const p of targetPerms) {
    const key = permKey(p.permissionName, p.permissionId);
    if (!sourcePermKeys.has(key) && !seenNew.has(key)) {
      seenNew.add(key);
      newPerms.push({
        permissionId: p.permissionId,
        permissionName: p.permissionName,
        system: p.system,
        targetRoles: targetPermMap.get(p.permissionId) || [],
      });
    }
  }

  const totalSource = sourcePermKeys.size;
  const covered = totalSource - uncovered.length;
  const coveragePercent = totalSource > 0 ? Math.round((covered / totalSource) * 100) : 100;

  return {
    sourcePermissions: sourcePerms,
    targetPermissions: targetPerms,
    uncoveredPermissions: uncovered,
    newPermissions: newPerms,
    coveragePercent,
  };
}

export interface GapAnalysisSummary {
  totalSourcePermissions: number;
  coveredPermissions: number;
  coveragePercent: number;
  gapsByPersona: {
    personaId: number;
    personaName: string;
    totalPermissions: number;
    uncoveredCount: number;
    uncoveredPermissions: {
      permissionId: string;
      permissionName: string | null;
      description: string | null;
    }[];
  }[];
}

/**
 * Computes gap analysis by comparing source permissions (via personas)
 * against target role permissions to find uncovered permissions.
 * Uses the permission_gaps table if populated.
 */
export async function getGapAnalysisSummary(orgId: number): Promise<GapAnalysisSummary> {
  const allPersonaPerms = await db
    .select({
      personaId: schema.personaSourcePermissions.personaId,
      sourcePermissionId: schema.personaSourcePermissions.sourcePermissionId,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      description: schema.sourcePermissions.description,
    })
    .from(schema.personaSourcePermissions)
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.personaSourcePermissions.sourcePermissionId))
    .innerJoin(schema.personas, eq(schema.personas.id, schema.personaSourcePermissions.personaId))
    .where(orgScope(schema.personas.organizationId, orgId));

  const personas = await db
    .select({ id: schema.personas.id, name: schema.personas.name })
    .from(schema.personas)
    .where(orgScope(schema.personas.organizationId, orgId));

  const personaNameMap = new Map(personas.map(p => [p.id, p.name]));

  // Get all gaps from the permission_gaps table
  const gaps = await db
    .select({
      personaId: schema.permissionGaps.personaId,
      sourcePermissionId: schema.permissionGaps.sourcePermissionId,
    })
    .from(schema.permissionGaps);

  const gapSet = new Set(gaps.map(g => `${g.personaId}-${g.sourcePermissionId}`));

  // Group by persona
  const permsByPersona = new Map<number, typeof allPersonaPerms>();
  for (const p of allPersonaPerms) {
    const existing = permsByPersona.get(p.personaId) || [];
    existing.push(p);
    permsByPersona.set(p.personaId, existing);
  }

  const totalSourcePermissions = new Set(allPersonaPerms.map(p => p.sourcePermissionId)).size;
  const allUncoveredPermIds = new Set<number>();

  const gapsByPersona: GapAnalysisSummary["gapsByPersona"] = [];

  for (const [personaId, perms] of Array.from(permsByPersona)) {
    const uncoveredPermissions: { permissionId: string; permissionName: string | null; description: string | null }[] = [];
    for (const p of perms) {
      if (gapSet.has(`${personaId}-${p.sourcePermissionId}`)) {
        uncoveredPermissions.push({
          permissionId: p.permissionId,
          permissionName: p.permissionName,
          description: p.description,
        });
        allUncoveredPermIds.add(p.sourcePermissionId);
      }
    }

    if (uncoveredPermissions.length > 0) {
      gapsByPersona.push({
        personaId,
        personaName: personaNameMap.get(personaId) ?? "Unknown",
        totalPermissions: perms.length,
        uncoveredCount: uncoveredPermissions.length,
        uncoveredPermissions,
      });
    }
  }

  const coveredPermissions = totalSourcePermissions - allUncoveredPermIds.size;
  const coveragePercent = totalSourcePermissions > 0 ? Math.round((coveredPermissions / totalSourcePermissions) * 100) : 100;

  return {
    totalSourcePermissions,
    coveredPermissions,
    coveragePercent,
    gapsByPersona,
  };
}

// ─────────────────────────────────────────────
// BATCH USER GAP ANALYSIS (per-user access change summary)
// ─────────────────────────────────────────────

export interface UserGapSummaryRow {
  userId: number;
  displayName: string;
  department: string | null;
  jobTitle: string | null;
  personaName: string | null;
  personaId: number | null;
  sourceRoleCount: number;
  targetRoleCount: number;
  sourcePermCount: number;
  targetPermCount: number;
  uncoveredCount: number;
  newPermCount: number;
  coveragePercent: number;
  changeImpactLevel: "none" | "low" | "medium" | "high";
  reviewStatus: "pending" | "confirmed_as_is" | "remapped";
  reviewedAt: string | null;
}

/**
 * Batch gap analysis: computes per-user access change summary in a single query.
 * Shows how each user's source permissions compare to their target permissions
 * under the least access principle.
 */
export async function getBatchUserGapSummary(orgId: number): Promise<UserGapSummaryRow[]> {
  const rows = await db.execute(sql`
    WITH user_source_perms AS (
      SELECT usra.user_id,
             count(DISTINCT sp.permission_id) AS perm_count,
             array_agg(DISTINCT sp.permission_id) AS perm_ids
      FROM user_source_role_assignments usra
      JOIN source_role_permissions srp ON srp.source_role_id = usra.source_role_id
      JOIN source_permissions sp ON sp.id = srp.source_permission_id
      JOIN users u ON u.id = usra.user_id AND u.organization_id = ${orgId}
      GROUP BY usra.user_id
    ),
    user_target_perms AS (
      SELECT utra.user_id,
             count(DISTINCT tp.permission_id) AS perm_count,
             array_agg(DISTINCT tp.permission_id) AS perm_ids
      FROM user_target_role_assignments utra
      JOIN target_role_permissions trp ON trp.target_role_id = utra.target_role_id
      JOIN target_permissions tp ON tp.id = trp.target_permission_id
      JOIN users u ON u.id = utra.user_id AND u.organization_id = ${orgId}
      GROUP BY utra.user_id
    ),
    user_source_role_counts AS (
      SELECT usra.user_id, count(DISTINCT usra.source_role_id) AS role_count
      FROM user_source_role_assignments usra
      JOIN users u ON u.id = usra.user_id AND u.organization_id = ${orgId}
      GROUP BY usra.user_id
    ),
    user_target_role_counts AS (
      SELECT utra.user_id, count(DISTINCT utra.target_role_id) AS role_count
      FROM user_target_role_assignments utra
      JOIN users u ON u.id = utra.user_id AND u.organization_id = ${orgId}
      GROUP BY utra.user_id
    ),
    gap_calc AS (
      SELECT
        u.id AS user_id,
        COALESCE(usp.perm_count, 0)::int AS source_perm_count,
        COALESCE(utp.perm_count, 0)::int AS target_perm_count,
        COALESCE(
          (SELECT count(*) FROM unnest(usp.perm_ids) AS sid
           WHERE sid NOT IN (SELECT unnest(COALESCE(utp.perm_ids, ARRAY[]::text[])))),
          0
        )::int AS uncovered_count,
        COALESCE(
          (SELECT count(*) FROM unnest(utp.perm_ids) AS tid
           WHERE tid NOT IN (SELECT unnest(COALESCE(usp.perm_ids, ARRAY[]::text[])))),
          0
        )::int AS new_perm_count
      FROM users u
      LEFT JOIN user_source_perms usp ON usp.user_id = u.id
      LEFT JOIN user_target_perms utp ON utp.user_id = u.id
      WHERE u.organization_id = ${orgId}
        AND (usp.user_id IS NOT NULL OR utp.user_id IS NOT NULL)
    )
    SELECT
      u.id AS user_id,
      u.display_name,
      u.department,
      u.job_title,
      p.name AS persona_name,
      upa.persona_id,
      COALESCE(src.role_count, 0)::int AS source_role_count,
      COALESCE(tgt.role_count, 0)::int AS target_role_count,
      gc.source_perm_count,
      gc.target_perm_count,
      gc.uncovered_count,
      gc.new_perm_count,
      CASE WHEN gc.source_perm_count > 0
        THEN round(((gc.source_perm_count - gc.uncovered_count)::numeric / gc.source_perm_count) * 100)
        ELSE 100
      END AS coverage_percent,
      CASE
        WHEN gc.uncovered_count = 0 THEN 'none'
        WHEN (gc.uncovered_count::numeric / GREATEST(gc.source_perm_count, 1)) > 0.3 OR gc.uncovered_count > 20 THEN 'high'
        WHEN (gc.uncovered_count::numeric / GREATEST(gc.source_perm_count, 1)) > 0.1 OR gc.uncovered_count > 5 THEN 'medium'
        ELSE 'low'
      END AS change_impact_level,
      COALESCE(ugr.review_status, 'pending') AS review_status,
      ugr.reviewed_at
    FROM gap_calc gc
    JOIN users u ON u.id = gc.user_id
    LEFT JOIN user_persona_assignments upa ON upa.user_id = u.id
    LEFT JOIN personas p ON p.id = upa.persona_id
    LEFT JOIN user_source_role_counts src ON src.user_id = u.id
    LEFT JOIN user_target_role_counts tgt ON tgt.user_id = u.id
    LEFT JOIN user_gap_reviews ugr ON ugr.user_id = u.id AND ugr.organization_id = ${orgId}
    ORDER BY
      CASE
        WHEN gc.uncovered_count = 0 THEN 3
        WHEN (gc.uncovered_count::numeric / GREATEST(gc.source_perm_count, 1)) > 0.3 OR gc.uncovered_count > 20 THEN 0
        WHEN (gc.uncovered_count::numeric / GREATEST(gc.source_perm_count, 1)) > 0.1 OR gc.uncovered_count > 5 THEN 1
        ELSE 2
      END,
      gc.uncovered_count DESC
  `);

  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    userId: Number(r.user_id),
    displayName: String(r.display_name ?? ""),
    department: r.department ? String(r.department) : null,
    jobTitle: r.job_title ? String(r.job_title) : null,
    personaName: r.persona_name ? String(r.persona_name) : null,
    personaId: r.persona_id ? Number(r.persona_id) : null,
    sourceRoleCount: Number(r.source_role_count ?? 0),
    targetRoleCount: Number(r.target_role_count ?? 0),
    sourcePermCount: Number(r.source_perm_count ?? 0),
    targetPermCount: Number(r.target_perm_count ?? 0),
    uncoveredCount: Number(r.uncovered_count ?? 0),
    newPermCount: Number(r.new_perm_count ?? 0),
    coveragePercent: Number(r.coverage_percent ?? 100),
    changeImpactLevel: (r.change_impact_level as "none" | "low" | "medium" | "high") ?? "none",
    reviewStatus: (r.review_status as "pending" | "confirmed_as_is" | "remapped") ?? "pending",
    reviewedAt: r.reviewed_at ? String(r.reviewed_at) : null,
  }));
}
