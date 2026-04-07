import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * POST /api/mapping/gap-analysis
 * Computes permission gaps for all personas and writes results to permission_gaps table.
 * Algorithm: For each persona, compare source permissions against target role permissions
 * (via persona→target role mappings). Any source permission not covered = gap.
 */
export async function POST() {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin", "mapper"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const orgId = getOrgId(user);

  try {
    // 1. Get all personas for this org
    const personas = await db
      .select({ id: schema.personas.id, name: schema.personas.name })
      .from(schema.personas)
      .where(eq(schema.personas.organizationId, orgId));

    // 2. Get all persona source permissions
    const allPersonaSourcePerms = await db
      .select({
        personaId: schema.personaSourcePermissions.personaId,
        sourcePermissionId: schema.personaSourcePermissions.sourcePermissionId,
      })
      .from(schema.personaSourcePermissions)
      .innerJoin(schema.personas, eq(schema.personas.id, schema.personaSourcePermissions.personaId))
      .where(eq(schema.personas.organizationId, orgId));

    // 3. Get all persona→target role mappings
    const allMappings = await db
      .select({
        personaId: schema.personaTargetRoleMappings.personaId,
        targetRoleId: schema.personaTargetRoleMappings.targetRoleId,
      })
      .from(schema.personaTargetRoleMappings)
      .innerJoin(schema.personas, eq(schema.personas.id, schema.personaTargetRoleMappings.personaId))
      .where(eq(schema.personas.organizationId, orgId));

    // 4. Get all target role permissions (permissionId level for matching)
    const allTargetRolePerms = await db
      .select({
        targetRoleId: schema.targetRolePermissions.targetRoleId,
        targetPermissionId: schema.targetRolePermissions.targetPermissionId,
        permissionId: schema.targetPermissions.permissionId,
      })
      .from(schema.targetRolePermissions)
      .innerJoin(schema.targetPermissions, eq(schema.targetRolePermissions.targetPermissionId, schema.targetPermissions.id));

    // 5. Get source permission IDs for matching
    const sourcePermRows = await db
      .select({ id: schema.sourcePermissions.id, permissionId: schema.sourcePermissions.permissionId })
      .from(schema.sourcePermissions);
    const sourcePermIdMap = new Map(sourcePermRows.map(r => [r.id, r.permissionId]));

    // Build lookup: targetRoleId → Set of permissionId strings
    const targetRolePermMap = new Map<number, Set<string>>();
    for (const trp of allTargetRolePerms) {
      if (!targetRolePermMap.has(trp.targetRoleId)) targetRolePermMap.set(trp.targetRoleId, new Set());
      targetRolePermMap.get(trp.targetRoleId)!.add(trp.permissionId);
    }

    // Build lookup: personaId → Set of targetRoleIds
    const personaMappingMap = new Map<number, Set<number>>();
    for (const m of allMappings) {
      if (!personaMappingMap.has(m.personaId)) personaMappingMap.set(m.personaId, new Set());
      personaMappingMap.get(m.personaId)!.add(m.targetRoleId);
    }

    // Build lookup: personaId → sourcePermissionIds (DB IDs)
    const personaSourcePermMap = new Map<number, number[]>();
    for (const psp of allPersonaSourcePerms) {
      if (!personaSourcePermMap.has(psp.personaId)) personaSourcePermMap.set(psp.personaId, []);
      personaSourcePermMap.get(psp.personaId)!.push(psp.sourcePermissionId);
    }

    // 6. Compute gaps per persona
    const gapRecords: { personaId: number; sourcePermissionId: number; gapType: string; notes: string }[] = [];

    for (const persona of personas) {
      const sourcePermIds = personaSourcePermMap.get(persona.id) || [];
      const mappedTargetRoleIds = personaMappingMap.get(persona.id) || new Set<number>();

      // Collect all target permission IDs covered by mapped roles
      const coveredPermIds = new Set<string>();
      const mappedRoleArr = Array.from(mappedTargetRoleIds);
      for (const trId of mappedRoleArr) {
        const perms = targetRolePermMap.get(trId);
        if (perms) {
          const permArr = Array.from(perms);
          for (const pid of permArr) coveredPermIds.add(pid);
        }
      }

      // Check each source permission
      for (const spDbId of sourcePermIds) {
        const sourcePermId = sourcePermIdMap.get(spDbId);
        if (!sourcePermId) continue;

        if (!coveredPermIds.has(sourcePermId)) {
          // Gap: source permission not covered by any target role
          const gapType = mappedTargetRoleIds.size === 0 ? "no_mapping" : "no_coverage";
          gapRecords.push({
            personaId: persona.id,
            sourcePermissionId: spDbId,
            gapType,
            notes: gapType === "no_mapping"
              ? "Persona has no target roles mapped"
              : `Source permission ${sourcePermId} not covered by any mapped target role`,
          });
        }
      }
    }

    // 7. Clear existing gaps and insert new ones
    await db.delete(schema.permissionGaps);

    if (gapRecords.length > 0) {
      // Insert in batches of 500
      for (let i = 0; i < gapRecords.length; i += 500) {
        const batch = gapRecords.slice(i, i + 500);
        await db.insert(schema.permissionGaps).values(batch);
      }
    }

    const personasWithGaps = new Set(gapRecords.map(g => g.personaId)).size;

    return NextResponse.json({
      success: true,
      totalGaps: gapRecords.length,
      personasAnalyzed: personas.length,
      personasWithGaps,
      personasClean: personas.length - personasWithGaps,
    });
  } catch (error) {
    console.error("[gap-analysis] Failed:", error);
    return NextResponse.json(
      { error: "Gap analysis failed", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
