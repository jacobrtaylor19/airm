import { requireRole } from "@/lib/auth";
import { AdminConsoleClient } from "./admin-console-client";
import { ActivityPulse } from "./activity-pulse";

export const dynamic = "force-dynamic";

export default async function AdminConsolePage() {
  const user = await requireRole(["system_admin"]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure project settings, AI integration, workflow rules, and manage users.
      </p>
      <ActivityPulse />
      <AdminConsoleClient currentUser={user.username} />
    </div>
  );
}
