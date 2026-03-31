import { getSodConflictsDetailed } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { getUserScope } from "@/lib/scope";
import { SodPageClient } from "./sod-client";

export const dynamic = "force-dynamic";

export default async function SodConflictAnalysisPage() {
  const currentUser = await getSessionUser();
  const orgId = getOrgId(currentUser!);
  let conflicts = await getSodConflictsDetailed(orgId);

  // Filter by org scope for mappers/approvers/coordinators
  if (currentUser && ["mapper", "approver", "coordinator"].includes(currentUser.role)) {
    const scopedUserIds = await getUserScope(currentUser);
    if (scopedUserIds !== null) {
      const idSet = new Set(scopedUserIds);
      conflicts = conflicts.filter(c => idSet.has(c.userId));
    }
  }

  const summary = {
    critical: conflicts.filter(c => c.severity === "critical").length,
    high: conflicts.filter(c => c.severity === "high").length,
    medium: conflicts.filter(c => c.severity === "medium").length,
    low: conflicts.filter(c => c.severity === "low").length,
    open: conflicts.filter(c => c.resolutionStatus === "open").length,
    pendingRiskAcceptance: conflicts.filter(c => c.resolutionStatus === "pending_risk_acceptance").length,
    resolved: conflicts.filter(c => !["open", "pending_risk_acceptance"].includes(c.resolutionStatus)).length,
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review, resolve, and manage segregation of duties conflicts across all user role assignments.
      </p>
      <SodPageClient
        conflicts={conflicts}
        summary={summary}
        userRole={currentUser?.role ?? null}
        userName={currentUser?.username ?? null}
      />
    </div>
  );
}
