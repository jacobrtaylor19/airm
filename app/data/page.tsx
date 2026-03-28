import {
  getUserSourceRoleAssignments,
  getAllSourcePermissions,
  getAllTargetPermissions,
} from "@/lib/queries";
import { DataExplorerClient } from "./data-explorer-client";

export const dynamic = "force-dynamic";

export default async function DataExplorerPage() {
  const userRoleAssignments = await getUserSourceRoleAssignments();
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
