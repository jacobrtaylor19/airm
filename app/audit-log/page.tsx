import { getAuditLog } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { AuditLogClient } from "./audit-log-client";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const user = await getSessionUser();
  const orgId = getOrgId(user!);
  const logs = await getAuditLog(orgId);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        View all state changes and actions.
      </p>
      <AuditLogClient logs={logs} />
    </div>
  );
}
