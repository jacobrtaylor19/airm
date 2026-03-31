export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { requireAuth } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";
import CalibrationClient from "./calibration-client";

export default async function CalibrationPage() {
  const user = await requireAuth();

  // Only mappers, admins, system_admins can calibrate
  if (!["system_admin", "admin", "mapper"].includes(user.role)) {
    redirect("/unauthorized");
  }

  const orgId = getOrgId(user);

  // Confidence distribution buckets for the trending chart
  const [dist] = await db
    .select({
      bucket0_10: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} < 10)`,
      bucket10_20: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 10 and ${schema.userPersonaAssignments.confidenceScore} < 20)`,
      bucket20_30: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 20 and ${schema.userPersonaAssignments.confidenceScore} < 30)`,
      bucket30_40: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 30 and ${schema.userPersonaAssignments.confidenceScore} < 40)`,
      bucket40_50: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 40 and ${schema.userPersonaAssignments.confidenceScore} < 50)`,
      bucket50_60: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 50 and ${schema.userPersonaAssignments.confidenceScore} < 60)`,
      bucket60_70: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 60 and ${schema.userPersonaAssignments.confidenceScore} < 70)`,
      bucket70_80: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 70 and ${schema.userPersonaAssignments.confidenceScore} < 80)`,
      bucket80_90: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 80 and ${schema.userPersonaAssignments.confidenceScore} < 90)`,
      bucket90_100: sql<number>`count(*) filter (where ${schema.userPersonaAssignments.confidenceScore} >= 90)`,
      total: sql<number>`count(*)`,
      avgConfidence: sql<number>`round(avg(${schema.userPersonaAssignments.confidenceScore})::numeric, 1)`,
    })
    .from(schema.userPersonaAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
    .where(orgScope(schema.users.organizationId, orgId));

  const confidenceDistribution = dist ? {
    buckets: [
      { range: "0-9", count: Number(dist.bucket0_10) },
      { range: "10-19", count: Number(dist.bucket10_20) },
      { range: "20-29", count: Number(dist.bucket20_30) },
      { range: "30-39", count: Number(dist.bucket30_40) },
      { range: "40-49", count: Number(dist.bucket40_50) },
      { range: "50-59", count: Number(dist.bucket50_60) },
      { range: "60-69", count: Number(dist.bucket60_70) },
      { range: "70-79", count: Number(dist.bucket70_80) },
      { range: "80-89", count: Number(dist.bucket80_90) },
      { range: "90-100", count: Number(dist.bucket90_100) },
    ],
    total: Number(dist.total),
    avgConfidence: Number(dist.avgConfidence) || 0,
  } : { buckets: [], total: 0, avgConfidence: 0 };

  return (
    <div className="space-y-6">
      <CalibrationClient userRole={user.role} />
      <ConfidenceChart distribution={confidenceDistribution} />
    </div>
  );
}

// Inline server-rendered component — no client JS needed
function ConfidenceChart({ distribution }: {
  distribution: { buckets: { range: string; count: number }[]; total: number; avgConfidence: number };
}) {
  const maxCount = Math.max(...distribution.buckets.map(b => b.count), 1);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Confidence Distribution</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{distribution.total.toLocaleString()} assignments</span>
          <span>Avg: <strong className="text-foreground">{distribution.avgConfidence}%</strong></span>
        </div>
      </div>

      {distribution.total === 0 ? (
        <p className="text-sm text-muted-foreground">No persona assignments yet.</p>
      ) : (
        <div className="flex items-end gap-1.5 h-32">
          {distribution.buckets.map((bucket) => {
            const height = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
            const rangeNum = parseInt(bucket.range);
            const barColor =
              rangeNum >= 80 ? "bg-emerald-500" :
              rangeNum >= 50 ? "bg-yellow-500" :
              "bg-red-500";

            return (
              <div key={bucket.range} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground font-mono">{bucket.count > 0 ? bucket.count : ""}</span>
                <div className="w-full relative" style={{ height: "100px" }}>
                  <div
                    className={`absolute bottom-0 w-full rounded-t ${barColor} transition-all`}
                    style={{ height: `${Math.max(height, bucket.count > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{bucket.range}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
