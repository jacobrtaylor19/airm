import { requireRole } from "@/lib/auth";
import { AdminUsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default function AdminUsersPage() {
  requireRole(["admin", "system_admin"]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Manage App Users</h2>
        <p className="text-sm text-muted-foreground">
          Create and manage tool users (mappers, approvers, admins).
        </p>
      </div>
      <AdminUsersClient />
    </div>
  );
}
