import { getSourceRoles, getSourceRoleDetail } from "@/lib/queries";
import { SourceRolesClient } from "./source-roles-client";

export const dynamic = "force-dynamic";

export default function SourceRolesPage() {
  const roles = getSourceRoles();

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
      <div>
        <h2 className="text-xl font-semibold">Source Roles</h2>
        <p className="text-sm text-muted-foreground">
          Browse legacy system roles and their permissions.
        </p>
      </div>
      <SourceRolesClient roles={roles} rolePermissions={rolePermissions} />
    </div>
  );
}
