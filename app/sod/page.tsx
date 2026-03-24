import { getSodConflicts } from "@/lib/queries";
import { SodPageClient } from "./sod-client";

export const dynamic = "force-dynamic";

export default function SodConflictAnalysisPage() {
  const conflicts = getSodConflicts();

  const summary = {
    critical: conflicts.filter(c => c.severity === "critical").length,
    high: conflicts.filter(c => c.severity === "high").length,
    medium: conflicts.filter(c => c.severity === "medium").length,
    low: conflicts.filter(c => c.severity === "low").length,
    open: conflicts.filter(c => c.resolutionStatus === "open").length,
    resolved: conflicts.filter(c => c.resolutionStatus !== "open").length,
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">SOD Conflict Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Run and review segregation of duties conflict analysis.
        </p>
      </div>
      <SodPageClient conflicts={conflicts} summary={summary} />
    </div>
  );
}
