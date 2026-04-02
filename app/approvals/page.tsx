import { getApprovalQueue } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { getUserScope } from "@/lib/scope";
import { getReleasesForAppUser, getReleaseUserIds } from "@/lib/releases";
import { cookies } from "next/headers";
import { ApprovalsClient } from "./approvals-client";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const user = await requireAuth();
  const orgId = getOrgId(user);

  // Get full queue, then filter by org scope
  let queue = await getApprovalQueue(orgId);
  if (user.role === "approver") {
    const scopedUserIds = await getUserScope(user);
    if (scopedUserIds !== null) {
      const idSet = new Set(scopedUserIds);
      queue = queue.filter((a) => idSet.has(a.userId));
    }
  }

  // Release filter
  const userReleases = await getReleasesForAppUser(user);
  const cookieReleaseId = parseInt(cookies().get("airm_release_id")?.value ?? "") || null;
  const activeReleaseId = userReleases.some((r) => r.id === cookieReleaseId)
    ? cookieReleaseId
    : userReleases.length === 1
    ? userReleases[0].id
    : (userReleases.find((r) => r.isActive)?.id ?? null);

  if (activeReleaseId) {
    const releaseUserIds = await getReleaseUserIds(activeReleaseId);
    if (releaseUserIds !== null) {
      const releaseSet = new Set(releaseUserIds);
      queue = queue.filter((a) => releaseSet.has(a.userId));
    }
  }

  const pendingReview = queue.filter(a => a.status === "pending_review");
  const readyForApproval = queue.filter(a => a.status === "ready_for_approval");
  const approved = queue.filter(a => a.status === "approved");
  const complianceApproved = queue.filter(a => a.status === "compliance_approved");
  const sodRiskAccepted = queue.filter(a => a.status === "sod_risk_accepted");

  // Compute department-level stats for bulk department approval
  const approvableStatuses = ["ready_for_approval", "compliance_approved", "sod_risk_accepted"];
  const deptStatsMap = new Map<string, { total: number; sodFlagged: number }>();
  for (const a of queue) {
    if (!a.department || !approvableStatuses.includes(a.status)) continue;
    const existing = deptStatsMap.get(a.department) ?? { total: 0, sodFlagged: 0 };
    existing.total++;
    if ((a.sodConflictCount ?? 0) > 0) existing.sodFlagged++;
    deptStatsMap.set(a.department, existing);
  }
  const departmentStats = Array.from(deptStatsMap.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review and approve finalized role mappings.
      </p>
      <ApprovalsClient
        queue={queue}
        counts={{
          pendingReview: pendingReview.length,
          readyForApproval: readyForApproval.length,
          approved: approved.length,
          complianceApproved: complianceApproved.length,
          sodRiskAccepted: sodRiskAccepted.length,
          total: queue.length,
        }}
        userRole={user.role}
        departmentStats={departmentStats}
      />
    </div>
  );
}
