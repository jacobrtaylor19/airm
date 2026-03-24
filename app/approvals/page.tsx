import { getApprovalQueue } from "@/lib/queries";
import { ApprovalsClient } from "./approvals-client";

export const dynamic = "force-dynamic";

export default function ApprovalsPage() {
  const queue = getApprovalQueue();

  const readyForApproval = queue.filter(a => a.status === "ready_for_approval");
  const approved = queue.filter(a => a.status === "approved");
  const complianceApproved = queue.filter(a => a.status === "compliance_approved");
  const sodRiskAccepted = queue.filter(a => a.status === "sod_risk_accepted");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Approval Queue</h2>
        <p className="text-sm text-muted-foreground">
          Review and approve finalized role mappings.
        </p>
      </div>
      <ApprovalsClient
        queue={queue}
        counts={{
          readyForApproval: readyForApproval.length,
          approved: approved.length,
          complianceApproved: complianceApproved.length,
          sodRiskAccepted: sodRiskAccepted.length,
          total: queue.length,
        }}
      />
    </div>
  );
}
