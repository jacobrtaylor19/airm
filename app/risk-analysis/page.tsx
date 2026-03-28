import { requireAuth } from "@/lib/auth";
import { getAggregateRiskAnalysis } from "@/lib/queries";
import { getUserScope } from "@/lib/scope";
import { RiskAnalysisClient } from "./risk-analysis-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function RiskAnalysisPage() {
  const user = await requireAuth();

  // Scope-aware: non-admins only see their org unit's risk
  const scopedUserIds = await getUserScope(user);
  const risk = await getAggregateRiskAnalysis(scopedUserIds);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risk Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aggregated risk metrics across {risk.totalUsersAnalyzed} analyzed users
        </p>
      </div>
      <RiskAnalysisClient risk={risk} />
    </div>
  );
}
