import { getSourceRoles, getSourceRoleDetail, getDistinctSourceSystems } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { SourceRolesClient } from "./source-roles-client";

export const dynamic = "force-dynamic";

export default function SourceRolesPage() {
  const roles = getSourceRoles();
  const systems = getDistinctSourceSystems();
  const currentUser = getSessionUser();
  const isAdmin = currentUser ? ["admin", "system_admin"].includes(currentUser.role) : false;

  // Pre-fetch permission details for all roles (expandable rows need them)
  const rolePermissions: Record<number, { id: number; permissionId: string; permissionName: string | null; permissionType: string | null; riskLevel: string | null }[]> = {};
  for (const role of roles) {
    const detail = getSourceRoleDetail(role.id);
    if (detail) {
      rolePermissions[role.id] = detail.permissions;
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Browse legacy system roles and their permissions across all source systems.
      </p>
      <SourceRolesClient roles={roles} rolePermissions={rolePermissions} systems={systems} isAdmin={isAdmin} />
    </div>
  );
}
