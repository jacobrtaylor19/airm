import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAdapter } from "@/lib/adapters";
import type { SecurityDesignChange } from "@/lib/adapters";
import { db } from "@/db";
import * as schema from "@/db/schema";
// drizzle-orm operators available if needed for future queries
import { getSetting, setSetting } from "@/lib/settings";
import { getOrgId, orgScope } from "@/lib/org-context";
import { reportError } from "@/lib/monitoring";

export async function POST() {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adapterType = (await getSetting("target_system_adapter")) ?? "mock";
    const adapter = getAdapter(adapterType);
    const orgId = getOrgId(user);

    // Pull the full security design from the target system
    const snapshot = await adapter.pullSecurityDesign();

    // Get existing target roles for comparison
    const existingRoles = await db
      .select({
        id: schema.targetRoles.id,
        roleId: schema.targetRoles.roleId,
        roleName: schema.targetRoles.roleName,
        description: schema.targetRoles.description,
      })
      .from(schema.targetRoles)
      .where(orgScope(schema.targetRoles.organizationId, orgId));

    const existingRoleMap = new Map(
      existingRoles.map((r) => [r.roleId, r])
    );
    const snapshotRoleMap = new Map(
      snapshot.roles.map((r) => [r.externalId, r])
    );

    // Compute changes
    const changes: SecurityDesignChange[] = [];

    // Check for new roles and modified roles
    for (const role of snapshot.roles) {
      const existing = existingRoleMap.get(role.externalId);
      if (!existing) {
        changes.push({
          changeType: "role_added",
          roleName: role.name,
          roleExternalId: role.externalId,
          detail: `New role detected: ${role.name} (${role.externalId}) with ${role.permissions.length} permissions`,
          detectedAt: new Date(),
        });
      } else if (
        existing.roleName !== role.name ||
        existing.description !== role.description
      ) {
        changes.push({
          changeType: "role_modified",
          roleName: role.name,
          roleExternalId: role.externalId,
          detail: `Role definition changed: name or description updated`,
          detectedAt: new Date(),
        });
      }
    }

    // Check for removed roles
    for (const [roleId, existing] of Array.from(existingRoleMap.entries())) {
      if (!snapshotRoleMap.has(roleId)) {
        changes.push({
          changeType: "role_removed",
          roleName: existing.roleName,
          roleExternalId: roleId,
          detail: `Role ${existing.roleName} (${roleId}) no longer present in target system`,
          detectedAt: new Date(),
        });
      }
    }

    // Also get adapter-reported changes (from mock: since last pull)
    const lastPullStr = await getSetting("last_security_design_pull");
    const lastPull = lastPullStr ? new Date(lastPullStr) : new Date(0);
    const adapterChanges = await adapter.getChanges(lastPull);

    // Merge adapter-reported changes (avoid duplicates by roleExternalId+changeType)
    const changeKey = (c: SecurityDesignChange) =>
      `${c.roleExternalId}:${c.changeType}`;
    const existingKeys = new Set(changes.map(changeKey));

    for (const ac of adapterChanges) {
      if (!existingKeys.has(changeKey(ac))) {
        changes.push(ac);
      }
    }

    // Store changes in the database
    if (changes.length > 0) {
      // Find matching target role IDs for the changes
      for (const change of changes) {
        const matchingRole = existingRoles.find(
          (r) => r.roleId === change.roleExternalId
        );

        await db.insert(schema.securityDesignChanges).values({
          targetRoleId: matchingRole?.id ?? null,
          changeType: change.changeType,
          roleName: change.roleName,
          roleExternalId: change.roleExternalId,
          detail: change.detail,
          changeDescription: change.detail,
          status: "pending",
          detectedAt: change.detectedAt.toISOString(),
          detectedBy: "integration_adapter",
          organizationId: orgId,
        });
      }
    }

    // Update last pull timestamp
    await setSetting("last_security_design_pull", new Date().toISOString());

    return NextResponse.json({
      snapshot: {
        pulledAt: snapshot.pulledAt.toISOString(),
        roleCount: snapshot.roles.length,
        totalPermissions: snapshot.totalPermissions,
        roles: snapshot.roles.map((r) => ({
          externalId: r.externalId,
          name: r.name,
          type: r.type,
          permissionCount: r.permissions.length,
        })),
      },
      changes: changes.map((c) => ({
        changeType: c.changeType,
        roleName: c.roleName,
        roleExternalId: c.roleExternalId,
        detail: c.detail,
        detectedAt: c.detectedAt.toISOString(),
      })),
      changeCount: changes.length,
    });
  } catch (err) {
    reportError(err, { route: "POST /api/admin/security-design/pull" });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to pull security design" },
      { status: 500 }
    );
  }
}
