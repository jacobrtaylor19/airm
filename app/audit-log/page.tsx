import { getAuditLog } from "@/lib/queries";
import { AuditLogClient } from "./audit-log-client";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const logs = await getAuditLog();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        View all state changes and actions.
      </p>
      <AuditLogClient logs={logs} />
    </div>
  );
}
