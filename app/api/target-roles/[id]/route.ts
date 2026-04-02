import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";
import { createWorkflowNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const orgId = getOrgId(user);
    const roleId = parseInt(params.id, 10);

    const [role] = await db
      .select()
      .from(schema.targetRoles)
      .where(and(eq(schema.targetRoles.id, roleId), eq(schema.targetRoles.organizationId, orgId)));

    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    // Get permissions
    const permissions = await db
      .select({
        id: schema.targetPermissions.id,
        permissionId: schema.targetPermissions.permissionId,
        permissionName: schema.targetPermissions.permissionName,
        permissionType: schema.targetPermissions.permissionType,
        riskLevel: schema.targetPermissions.riskLevel,
      })
      .from(schema.targetRolePermissions)
      .innerJoin(schema.targetPermissions, eq(schema.targetPermissions.id, schema.targetRolePermissions.targetPermissionId))
      .where(eq(schema.targetRolePermissions.targetRoleId, roleId));

    return NextResponse.json({ role, permissions });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (!["admin", "system_admin", "security_architect"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const orgId = getOrgId(user);
    const roleId = parseInt(params.id, 10);
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(schema.targetRoles)
      .where(and(eq(schema.targetRoles.id, roleId), eq(schema.targetRoles.organizationId, orgId)));

    if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    };

    if (body.roleName !== undefined) updates.roleName = body.roleName;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status !== undefined) updates.status = body.status;
    if (body.roleOwner !== undefined) updates.roleOwner = body.roleOwner;

    await db.update(schema.targetRoles).set(updates).where(eq(schema.targetRoles.id, roleId));

    await auditLog({
      organizationId: orgId,
      entityType: "target_role",
      entityId: roleId,
      action: "role.updated",
      actorEmail: user.email ?? user.username,
      oldValue: JSON.stringify({ roleName: existing.roleName, description: existing.description, status: existing.status }),
      newValue: JSON.stringify(updates),
    });

    // Notify mappers who have assignments for this role (Block E)
    if (existing.status === "active") {
      notifyAffectedMappers(roleId, existing.roleName, user.displayName).catch(() => {});
    }

    const [updated] = await db.select().from(schema.targetRoles).where(eq(schema.targetRoles.id, roleId));
    return NextResponse.json({ role: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (!["admin", "system_admin", "security_architect"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const orgId = getOrgId(user);
    const roleId = parseInt(params.id, 10);

    const [existing] = await db
      .select()
      .from(schema.targetRoles)
      .where(and(eq(schema.targetRoles.id, roleId), eq(schema.targetRoles.organizationId, orgId)));

    if (!existing) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    // Soft delete — archive
    await db.update(schema.targetRoles).set({
      status: "archived",
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    }).where(eq(schema.targetRoles.id, roleId));

    await auditLog({
      organizationId: orgId,
      entityType: "target_role",
      entityId: roleId,
      action: "role.archived",
      actorEmail: user.email ?? user.username,
      oldValue: JSON.stringify({ status: existing.status }),
      newValue: JSON.stringify({ status: "archived" }),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

/** Fire-and-forget: notify mappers with active assignments for this role */
async function notifyAffectedMappers(roleId: number, roleName: string, editorName: string) {
  const assignments = await db
    .select({ userId: schema.userTargetRoleAssignments.userId })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.targetRoleId, roleId));

  if (assignments.length === 0) return;

  // Find mapper users
  const mappers = await db
    .select({ id: schema.appUsers.id, role: schema.appUsers.role })
    .from(schema.appUsers);

  const mapperIds = mappers.filter((m) => m.role === "mapper" || m.role === "admin" || m.role === "system_admin").map((m) => m.id);

  for (const mapperId of mapperIds) {
    await createWorkflowNotification({
      toUserId: mapperId,
      notificationType: "workflow_event",
      subject: `Target role updated: ${roleName}`,
      message: `The role '${roleName}' was updated by ${editorName}. Review your assignments to ensure they are still appropriate.`,
      actionUrl: "/mapping",
    });
  }
}
