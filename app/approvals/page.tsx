import { getApprovalQueue } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getReleasesForAppUser, getReleaseUserIds } from "@/lib/releases";
import { cookies } from "next/headers";
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

  // Release filter
  const userReleases = getReleasesForAppUser(user);
  const cookieReleaseId = parseInt(cookies().get("airm_release_id")?.value ?? "") || null;
  const activeReleaseId = userReleases.some((r) => r.id === cookieReleaseId)
    ? cookieReleaseId
    : userReleases.length === 1
    ? userReleases[0].id
    : (userReleases.find((r) => r.isActive)?.id ?? null);

  if (activeReleaseId) {
    const releaseUserIds = getReleaseUserIds(activeReleaseId);
    if (releaseUserIds !== null) {
      const releaseSet = new Set(releaseUserIds);
      queue = queue.filter((a) => releaseSet.has(a.userId));
    }
  }

  const readyForApproval = queue.filter(a => a.status === "ready_for_approval");
  const approved = queue.filter(a => a.status === "approved");
  const complianceApproved = queue.filter(a => a.status === "compliance_approved");
  const sodRiskAccepted = queue.filter(a => a.status === "sod_risk_accepted");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review and approve finalized role mappings.
      </p>
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
