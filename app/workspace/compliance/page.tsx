import { requireAuth, canAccessComplianceWorkspace } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { getComplianceQueue, getComplianceHistory } from "@/lib/queries/sod-triage";
import { redirect } from "next/navigation";
import { ComplianceClient } from "./compliance-client";

export const dynamic = "force-dynamic";

export default async function ComplianceWorkspacePage() {
  const user = await requireAuth();

  if (!canAccessComplianceWorkspace(user.role)) {
    redirect("/dashboard");
  }

  const orgId = getOrgId(user);
  const [queue, history] = await Promise.all([
    getComplianceQueue(orgId),
    getComplianceHistory(orgId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Compliance Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Review structural SOD violations and determine resolution paths.
        </p>
      </div>
      <ComplianceClient queue={queue} history={history} />
    </div>
  );
}
