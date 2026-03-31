import {
  getUserSourceRoleAssignments,
  getAllSourcePermissions,
  getAllTargetPermissions,
} from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { DataExplorerClient } from "./data-explorer-client";

export const dynamic = "force-dynamic";

export default async function DataExplorerPage() {
  const user = await getSessionUser();
  const orgId = getOrgId(user!);
  const userRoleAssignments = await getUserSourceRoleAssignments(orgId);
  const sourcePermissions = await getAllSourcePermissions();
  const targetPermissions = await getAllTargetPermissions();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Browse legacy source system access: user-role assignments from the source system, source permissions, and target permissions.
      </p>
      <DataExplorerClient
        userRoleAssignments={userRoleAssignments}
        sourcePermissions={sourcePermissions}
        targetPermissions={targetPermissions}
      />
    </div>
  );
}
