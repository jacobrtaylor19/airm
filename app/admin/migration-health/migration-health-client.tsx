"use client";

import { UserCircle, Route, ShieldAlert, CheckCircle, Activity } from "lucide-react";
import type { MigrationHealthData } from "@/lib/queries/migration-health";

function KpiCard({
  label,
  value,
  total,
  percentage,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  total: number;
  percentage: number;
  icon: React.ElementType;
  color: string;
}) {
  const barColor =
    percentage >= 80 ? "bg-emerald-500" :
    percentage >= 50 ? "bg-yellow-500" :
    "bg-red-500";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`rounded-md p-2 ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="text-2xl font-bold">{percentage}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{value.toLocaleString()} / {total.toLocaleString()}</p>
    </div>
  );
}

function PipelineStage({
  stage,
  completed,
  total,
  percentage,
  isLast,
}: {
  stage: string;
  completed: number;
  total: number;
  percentage: number;
  isLast: boolean;
}) {
  const stageColor =
    percentage >= 80 ? "bg-emerald-500 border-emerald-500" :
    percentage >= 50 ? "bg-yellow-500 border-yellow-500" :
    percentage > 0 ? "bg-orange-500 border-orange-500" :
    "bg-muted border-muted-foreground/30";

  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex flex-col items-center gap-1">
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold ${stageColor} text-white`}>
          {percentage}%
        </div>
        <span className="text-xs text-center text-muted-foreground whitespace-nowrap">{stage}</span>
        <span className="text-xs text-muted-foreground">{completed}/{total}</span>
      </div>
      {!isLast && (
        <div className="h-0.5 flex-1 bg-muted-foreground/20 min-w-4" />
      )}
    </div>
  );
}

function ConfidenceDistribution({
  high,
  medium,
  low,
}: {
  high: number;
  medium: number;
  low: number;
}) {
  const total = high + medium + low;
  if (total === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium mb-3">Confidence Distribution</h3>
        <p className="text-sm text-muted-foreground">No persona assignments yet.</p>
      </div>
    );
  }

  const segments = [
    { label: "High (≥80%)", count: high, pct: Math.round((high / total) * 100), color: "bg-emerald-500" },
    { label: "Medium (50-79%)", count: medium, pct: Math.round((medium / total) * 100), color: "bg-yellow-500" },
    { label: "Low (<50%)", count: low, pct: Math.round((low / total) * 100), color: "bg-red-500" },
  ];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-medium">Confidence Distribution</h3>
      <div className="flex h-4 rounded-full overflow-hidden bg-muted">
        {segments.map(s => s.pct > 0 && (
          <div key={s.label} className={`${s.color} transition-all`} style={{ width: `${s.pct}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {segments.map(s => (
          <div key={s.label} className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              <span className="text-lg font-bold">{s.count.toLocaleString()}</span>
            </div>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MigrationHealthClient({ data }: { data: MigrationHealthData }) {
  const overallScore = Math.round(
    (data.personaCoverage * 0.25) +
    (data.mappingCoverage * 0.25) +
    (data.approvalRate * 0.25) +
    (data.sodResolutionRate * 0.25)
  );

  const scoreColor =
    overallScore >= 80 ? "text-emerald-500" :
    overallScore >= 50 ? "text-yellow-500" :
    "text-red-500";

  const scoreBg =
    overallScore >= 80 ? "bg-emerald-500/10 border-emerald-500/30" :
    overallScore >= 50 ? "bg-yellow-500/10 border-yellow-500/30" :
    "bg-red-500/10 border-red-500/30";

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <div className={`rounded-lg border p-6 flex items-center gap-6 ${scoreBg}`}>
        <div className="text-center">
          <div className={`text-5xl font-bold ${scoreColor}`}>{overallScore}</div>
          <div className="text-sm text-muted-foreground mt-1">Health Score</div>
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold">
            {overallScore >= 80 ? "Migration On Track" :
             overallScore >= 50 ? "Migration Needs Attention" :
             "Migration At Risk"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {overallScore >= 80
              ? "Coverage, mapping, and approval rates are healthy. Keep pushing towards completion."
              : overallScore >= 50
              ? "Some pipeline stages need attention. Focus on the lowest-scoring areas below."
              : "Multiple pipeline stages are incomplete. Prioritize persona assignment and role mapping."}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span>{data.recentAuditActions} actions in last 7 days</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Persona Coverage"
          value={data.usersWithPersona}
          total={data.totalUsers}
          percentage={data.personaCoverage}
          icon={UserCircle}
          color="bg-teal-500"
        />
        <KpiCard
          label="Mapping Coverage"
          value={data.personasWithMapping}
          total={data.totalPersonas}
          percentage={data.mappingCoverage}
          icon={Route}
          color="bg-teal-500"
        />
        <KpiCard
          label="SOD Resolution"
          value={data.resolvedSodConflicts}
          total={data.totalSodConflicts}
          percentage={data.sodResolutionRate}
          icon={ShieldAlert}
          color="bg-orange-500"
        />
        <KpiCard
          label="Approval Rate"
          value={data.approvedMappings}
          total={data.totalMappings}
          percentage={data.approvalRate}
          icon={CheckCircle}
          color="bg-emerald-500"
        />
      </div>

      {/* Pipeline Visualization */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-medium">Pipeline Completeness</h3>
        <div className="flex items-start gap-0 overflow-x-auto pb-2">
          {data.pipelineStages.map((s, i) => (
            <PipelineStage
              key={s.stage}
              stage={s.stage}
              completed={s.completed}
              total={s.total}
              percentage={s.percentage}
              isLast={i === data.pipelineStages.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Confidence Distribution */}
      <ConfidenceDistribution
        high={data.highConfidence}
        medium={data.mediumConfidence}
        low={data.lowConfidence}
      />
    </div>
  );
}
