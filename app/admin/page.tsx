import { requireRole } from "@/lib/auth";
import { AdminConsoleClient } from "./admin-console-client";

export const dynamic = "force-dynamic";

export default function AdminConsolePage() {
  const user = requireRole(["system_admin"]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure project settings, AI integration, workflow rules, and manage users.
      </p>
      <AdminConsoleClient currentUser={user.username} />
    </div>
  );
}
