import {
  getUserSourceRoleAssignments,
  getAllSourcePermissions,
  getAllTargetPermissions,
} from "@/lib/queries";
import { DataExplorerClient } from "./data-explorer-client";

export const dynamic = "force-dynamic";

export default function DataExplorerPage() {
  const userRoleAssignments = getUserSourceRoleAssignments();
  const sourcePermissions = getAllSourcePermissions();
  const targetPermissions = getAllTargetPermissions();

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
