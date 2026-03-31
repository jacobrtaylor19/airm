import { db } from "@/db";
import * as schema from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

export interface PersonaRow {
  id: number;
  name: string;
  description: string | null;
  businessFunction: string | null;
  groupName: string | null;
  groupId: number | null;
  source: string;
  userCount: number;
}

export async function getPersonas(orgId: number): Promise<PersonaRow[]> {
  return await db
    .select({
      id: schema.personas.id,
      name: schema.personas.name,
      description: schema.personas.description,
      businessFunction: schema.personas.businessFunction,
      groupName: schema.consolidatedGroups.name,
      groupId: schema.personas.consolidatedGroupId,
      source: schema.personas.source,
      userCount: sql<number>`(
        SELECT count(*) FROM user_persona_assignments upa
        WHERE upa.persona_id = personas.id
      )`,
    })
    .from(schema.personas)
    .leftJoin(
      schema.consolidatedGroups,
      eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId)
    )
    .where(orgScope(schema.personas.organizationId, orgId));
}

export interface PersonaDetail {
  id: number;
  name: string;
  description: string | null;
  businessFunction: string | null;
  source: string;
  groupName: string | null;
  groupId: number | null;
  sourcePermissions: {
    id: number;
    permissionId: string;
    permissionName: string | null;
    weight: number | null;
    isRequired: boolean | null;
  }[];
  users: {
    id: number;
    displayName: string;
    department: string | null;
    jobTitle: string | null;
    confidenceScore: number | null;
  }[];
  targetRoleMappings: {
    id: number;
    targetRoleId: number;
    roleName: string;
    roleId: string;
    coveragePercent: number | null;
    excessPercent: number | null;
    confidence: string | null;
    roleOwner: string | null;
  }[];
}

export async function getPersonaDetail(orgId: number, id: number): Promise<PersonaDetail | null> {
  const [persona] = await db
    .select({
      id: schema.personas.id,
      name: schema.personas.name,
      description: schema.personas.description,
      businessFunction: schema.personas.businessFunction,
      source: schema.personas.source,
      groupName: schema.consolidatedGroups.name,
      groupId: schema.personas.consolidatedGroupId,
    })
    .from(schema.personas)
    .leftJoin(schema.consolidatedGroups, eq(schema.consolidatedGroups.id, schema.personas.consolidatedGroupId))
    .where(and(eq(schema.personas.id, id), orgScope(schema.personas.organizationId, orgId)));

  if (!persona) return null;

  const sourcePermissions = await db
    .select({
      id: schema.sourcePermissions.id,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      weight: schema.personaSourcePermissions.weight,
      isRequired: schema.personaSourcePermissions.isRequired,
    })
    .from(schema.personaSourcePermissions)
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.personaSourcePermissions.sourcePermissionId))
    .where(eq(schema.personaSourcePermissions.personaId, id));

  const users = await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      department: schema.users.department,
      jobTitle: schema.users.jobTitle,
      confidenceScore: schema.userPersonaAssignments.confidenceScore,
    })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
    .where(eq(schema.userPersonaAssignments.personaId, id));

  const targetRoleMappings = await db
    .select({
      id: schema.personaTargetRoleMappings.id,
      targetRoleId: schema.personaTargetRoleMappings.targetRoleId,
      roleName: schema.targetRoles.roleName,
      roleId: schema.targetRoles.roleId,
      roleOwner: schema.targetRoles.roleOwner,
      coveragePercent: schema.personaTargetRoleMappings.coveragePercent,
      excessPercent: schema.personaTargetRoleMappings.excessPercent,
      confidence: schema.personaTargetRoleMappings.confidence,
    })
    .from(schema.personaTargetRoleMappings)
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.personaTargetRoleMappings.targetRoleId))
    .where(eq(schema.personaTargetRoleMappings.personaId, id));

  return {
    ...persona,
    sourcePermissions,
    users,
    targetRoleMappings,
  };
}

export interface GroupRow {
  id: number;
  name: string;
  description: string | null;
  accessLevel: string | null;
  domain: string | null;
  personaCount: number;
  userCount: number;
}

export async function getConsolidatedGroups(orgId: number): Promise<GroupRow[]> {
  return await db
    .select({
      id: schema.consolidatedGroups.id,
      name: schema.consolidatedGroups.name,
      description: schema.consolidatedGroups.description,
      accessLevel: schema.consolidatedGroups.accessLevel,
      domain: schema.consolidatedGroups.domain,
      personaCount: sql<number>`(
        SELECT count(*) FROM personas p
        WHERE p.consolidated_group_id = consolidated_groups.id
      )`,
      userCount: sql<number>`(
        SELECT count(*) FROM user_persona_assignments upa
        INNER JOIN personas p ON p.id = upa.persona_id
        WHERE p.consolidated_group_id = consolidated_groups.id
      )`,
    })
    .from(schema.consolidatedGroups)
    .where(orgScope(schema.consolidatedGroups.organizationId, orgId));
}

export async function getPersonaIdsForUsers(orgId: number, userIds: number[]): Promise<number[]> {
  if (userIds.length === 0) return [];
  const idSet = new Set(userIds);
  const assignments = await db.select({
    personaId: schema.userPersonaAssignments.personaId,
    userId: schema.userPersonaAssignments.userId,
  }).from(schema.userPersonaAssignments);

  const personaIds = new Set<number>();
  for (const a of assignments) {
    if (a.personaId && idSet.has(a.userId)) personaIds.add(a.personaId);
  }
  return Array.from(personaIds);
}

export interface PersonaSourceSystemInfo {
  personaId: number;
  systems: string[];
}

export async function getPersonaSourceSystems(orgId: number): Promise<Map<number, string[]>> {
  const rows = await db
    .select({
      personaId: schema.personaSourcePermissions.personaId,
      system: sql<string>`coalesce(${schema.sourcePermissions.system}, 'Unknown')`,
    })
    .from(schema.personaSourcePermissions)
    .innerJoin(
      schema.sourcePermissions,
      eq(schema.sourcePermissions.id, schema.personaSourcePermissions.sourcePermissionId)
    )
    .innerJoin(
      schema.personas,
      eq(schema.personas.id, schema.personaSourcePermissions.personaId)
    )
    .where(orgScope(schema.personas.organizationId, orgId))
    .groupBy(schema.personaSourcePermissions.personaId, schema.sourcePermissions.system);

  const map = new Map<number, string[]>();
  for (const row of rows) {
    const existing = map.get(row.personaId) ?? [];
    if (!existing.includes(row.system)) existing.push(row.system);
    map.set(row.personaId, existing);
  }
  return map;
}
