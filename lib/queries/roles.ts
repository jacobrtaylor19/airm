import { db } from "@/db";
import * as schema from "@/db/schema";
import { sql, eq } from "drizzle-orm";

export interface SourceRoleRow {
  id: number;
  roleId: string;
  roleName: string;
  domain: string | null;
  system: string | null;
  roleOwner: string | null;
  permissionCount: number;
  userCount: number;
}

export async function getSourceRoles(): Promise<SourceRoleRow[]> {
  return await db
    .select({
      id: schema.sourceRoles.id,
      roleId: schema.sourceRoles.roleId,
      roleName: schema.sourceRoles.roleName,
      domain: schema.sourceRoles.domain,
      system: schema.sourceRoles.system,
      roleOwner: schema.sourceRoles.roleOwner,
      permissionCount: sql<number>`(
        SELECT count(*) FROM source_role_permissions srp
        WHERE srp.source_role_id = source_roles.id
      )`,
      userCount: sql<number>`(
        SELECT count(*) FROM user_source_role_assignments usra
        WHERE usra.source_role_id = source_roles.id
      )`,
    })
    .from(schema.sourceRoles);
}

export interface SourceRoleDetail {
  id: number;
  roleId: string;
  roleName: string;
  description: string | null;
  domain: string | null;
  system: string | null;
  roleType: string | null;
  permissions: {
    id: number;
    permissionId: string;
    permissionName: string | null;
    permissionType: string | null;
    riskLevel: string | null;
  }[];
}

export async function getSourceRoleDetail(id: number): Promise<SourceRoleDetail | null> {
  const [role] = await db.select().from(schema.sourceRoles).where(eq(schema.sourceRoles.id, id));
  if (!role) return null;

  const permissions = await db
    .select({
      id: schema.sourcePermissions.id,
      permissionId: schema.sourcePermissions.permissionId,
      permissionName: schema.sourcePermissions.permissionName,
      permissionType: schema.sourcePermissions.permissionType,
      riskLevel: schema.sourcePermissions.riskLevel,
    })
    .from(schema.sourceRolePermissions)
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.sourceRolePermissions.sourcePermissionId))
    .where(eq(schema.sourceRolePermissions.sourceRoleId, id));

  return { ...role, permissions };
}

export interface TargetRoleRow {
  id: number;
  roleId: string;
  roleName: string;
  description: string | null;
  domain: string | null;
  system: string | null;
  roleOwner: string | null;
  permissionCount: number;
}

export async function getTargetRoles(): Promise<TargetRoleRow[]> {
  return await db
    .select({
      id: schema.targetRoles.id,
      roleId: schema.targetRoles.roleId,
      roleName: schema.targetRoles.roleName,
      description: schema.targetRoles.description,
      domain: schema.targetRoles.domain,
      system: schema.targetRoles.system,
      roleOwner: schema.targetRoles.roleOwner,
      permissionCount: sql<number>`(
        SELECT count(*) FROM target_role_permissions trp
        WHERE trp.target_role_id = target_roles.id
      )`,
    })
    .from(schema.targetRoles);
}

export interface TargetPermissionInfo {
  id: number;
  permissionId: string;
  permissionName: string | null;
  permissionType: string | null;
  riskLevel: string | null;
}

export async function getTargetRolePermissions(roleId: number): Promise<TargetPermissionInfo[]> {
  return await db
    .select({
      id: schema.targetPermissions.id,
      permissionId: schema.targetPermissions.permissionId,
      permissionName: schema.targetPermissions.permissionName,
      permissionType: schema.targetPermissions.permissionType,
      riskLevel: schema.targetPermissions.riskLevel,
    })
    .from(schema.targetRolePermissions)
    .innerJoin(
      schema.targetPermissions,
      eq(schema.targetPermissions.id, schema.targetRolePermissions.targetPermissionId)
    )
    .where(eq(schema.targetRolePermissions.targetRoleId, roleId));
}

export interface SimpleTargetRole {
  id: number;
  roleId: string;
  roleName: string;
  domain: string | null;
}

export async function getAllSimpleTargetRoles(): Promise<SimpleTargetRole[]> {
  return await db
    .select({
      id: schema.targetRoles.id,
      roleId: schema.targetRoles.roleId,
      roleName: schema.targetRoles.roleName,
      domain: schema.targetRoles.domain,
    })
    .from(schema.targetRoles);
}
