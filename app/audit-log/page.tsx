import { getAuditLog } from "@/lib/queries";
import { AuditLogClient } from "./audit-log-client";

export const dynamic = "force-dynamic";

export default function AuditLogPage() {
  const logs = getAuditLog();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          View all state changes and actions.
        </p>
      </div>
      <AuditLogClient logs={logs} />
    </div>
  );
}
