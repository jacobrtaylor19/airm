import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

export interface RemappingQueueItem {
  assignmentId: number;
  userId: number;
  userName: string;
  department: string | null;
  targetRoleId: number;
  roleName: string;
  roleCode: string;
  personaId: number | null;
  personaName: string | null;
  conflictPermA: string | null;
  conflictPermB: string | null;
  conflictSeverity: string | null;
}

export async function getRemappingQueue(
  orgId: number,
  scopedUserIds: number[] | null = null,
): Promise<RemappingQueueItem[]> {
  const baseWhere = and(
    eq(schema.userTargetRoleAssignments.status, "remap_required"),
    orgScope(schema.users.organizationId, orgId),
    scopedUserIds ? inArray(schema.users.id, scopedUserIds) : undefined,
  );

  const rows = await db
    .select({
      assignmentId: schema.userTargetRoleAssignments.id,
      userId: schema.userTargetRoleAssignments.userId,
      userName: schema.users.displayName,
      department: schema.users.department,
      targetRoleId: schema.userTargetRoleAssignments.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleCode: schema.targetRoles.roleId,
      personaId: schema.userTargetRoleAssignments.derivedFromPersonaId,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.userTargetRoleAssignments.targetRoleId))
    .where(baseWhere);

  if (rows.length === 0) return [];

  // Resolve persona names
  const personaIds = Array.from(new Set(rows.map(r => r.personaId).filter((id): id is number => id !== null)));
  const personaMap = new Map<number, string>();
  if (personaIds.length > 0) {
    const personaRows = await db
      .select({ id: schema.personas.id, name: schema.personas.name })
      .from(schema.personas)
      .where(inArray(schema.personas.id, personaIds));
    for (const p of personaRows) {
      personaMap.set(p.id, p.name);
    }
  }

  // Get the most recent SOD conflict for each user+role pair
  const userIds = Array.from(new Set(rows.map(r => r.userId)));
  const conflicts = await db
    .select({
      userId: schema.sodConflicts.userId,
      roleIdA: schema.sodConflicts.roleIdA,
      roleIdB: schema.sodConflicts.roleIdB,
      permissionIdA: schema.sodConflicts.permissionIdA,
      permissionIdB: schema.sodConflicts.permissionIdB,
      severity: schema.sodConflicts.severity,
    })
    .from(schema.sodConflicts)
    .where(and(
      inArray(schema.sodConflicts.userId, userIds),
      eq(schema.sodConflicts.conflictType, "between_role"),
    ));

  // Build a lookup: userId-roleId -> conflict info
  const conflictLookup = new Map<string, { permA: string | null; permB: string | null; severity: string }>();
  for (const c of conflicts) {
    if (c.roleIdA != null) {
      conflictLookup.set(`${c.userId}-${c.roleIdA}`, { permA: c.permissionIdA, permB: c.permissionIdB, severity: c.severity });
    }
    if (c.roleIdB != null) {
      conflictLookup.set(`${c.userId}-${c.roleIdB}`, { permA: c.permissionIdA, permB: c.permissionIdB, severity: c.severity });
    }
  }

  return rows.map(r => {
    const conflict = conflictLookup.get(`${r.userId}-${r.targetRoleId}`);
    return {
      ...r,
      personaName: r.personaId ? (personaMap.get(r.personaId) ?? null) : null,
      conflictPermA: conflict?.permA ?? null,
      conflictPermB: conflict?.permB ?? null,
      conflictSeverity: conflict?.severity ?? null,
    };
  });
}
