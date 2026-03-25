import { getSodConflictsDetailed } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { SodPageClient } from "./sod-client";

export const dynamic = "force-dynamic";

export default function SodConflictAnalysisPage() {
  const currentUser = getSessionUser();
  let conflicts = getSodConflictsDetailed();

  // Filter by org scope for mappers/approvers
  if (currentUser && ["mapper", "approver"].includes(currentUser.role)) {
    const scopedUserIds = getUserScope(currentUser);
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
      <div>
        <h2 className="text-xl font-semibold">SOD Conflict Resolution Workspace</h2>
        <p className="text-sm text-muted-foreground">
          Review, resolve, and manage segregation of duties conflicts across all user role assignments.
        </p>
      </div>
      <SodPageClient
        conflicts={conflicts}
        summary={summary}
        userRole={currentUser?.role ?? null}
        userName={currentUser?.username ?? null}
      />
    </div>
  );
}
