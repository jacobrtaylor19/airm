import { getApprovalQueue } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { ApprovalsClient } from "./approvals-client";

export const dynamic = "force-dynamic";

export default function ApprovalsPage() {
  const user = requireAuth();

  // Get full queue, then filter by org scope
  let queue = getApprovalQueue();
  if (user.role === "approver") {
    const scopedUserIds = getUserScope(user);
    if (scopedUserIds !== null) {
      const idSet = new Set(scopedUserIds);
      queue = queue.filter((a) => idSet.has(a.userId));
    }
  }

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
