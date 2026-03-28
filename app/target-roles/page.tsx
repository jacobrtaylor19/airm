import { getTargetRoles, getTargetRolePermissions } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { TargetRolesClient } from "./target-roles-client";

export const dynamic = "force-dynamic";

export default async function TargetRolesPage() {
  const roles = await getTargetRoles();
  const currentUser = await getSessionUser();
  const isAdmin = currentUser ? ["admin", "system_admin"].includes(currentUser.role) : false;

  // Pre-fetch permission details for all roles (expandable rows need them)
  const rolePermissions: Record<number, { id: number; permissionId: string; permissionName: string | null; permissionType: string | null; riskLevel: string | null }[]> = {};
  for (const role of roles) {
    rolePermissions[role.id] = await getTargetRolePermissions(role.id);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Browse the target system role library.
      </p>

      {roles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No target roles uploaded yet. Upload a target role library on the{" "}
          <a href="/upload" className="text-primary hover:underline">Data Upload</a> page.
        </div>
      ) : (
        <TargetRolesClient roles={roles} rolePermissions={rolePermissions} isAdmin={isAdmin} />
      )}
    </div>
  );
}
