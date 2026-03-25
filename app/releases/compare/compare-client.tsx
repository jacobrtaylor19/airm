"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCompare } from "lucide-react";
import type { ReleaseMetrics } from "./page";

interface Release {
  id: number;
  name: string;
  status: string;
}

interface CompareClientProps {
  releases: Release[];
  metricsMap: Record<number, ReleaseMetrics>;
}

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
};

function MetricRow({ label, valueA, valueB }: { label: string; valueA: React.ReactNode; valueB: React.ReactNode }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 px-4 text-sm font-medium text-slate-600">{label}</td>
      <td className="py-3 px-4 text-sm text-center">{valueA}</td>
      <td className="py-3 px-4 text-sm text-center">{valueB}</td>
    </tr>
  );
}

export function CompareClient({ releases, metricsMap }: CompareClientProps) {
  const [releaseA, setReleaseA] = useState<number | "">("");
  const [releaseB, setReleaseB] = useState<number | "">("");

  const metA = releaseA !== "" ? metricsMap[releaseA] : null;
  const metB = releaseB !== "" ? metricsMap[releaseB] : null;

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="h-4 w-4" />
            Select Releases to Compare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Release A</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={releaseA}
                onChange={(e) => setReleaseA(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">-- Select release --</option>
                {releases.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.id === releaseB}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <span className="text-slate-400 font-bold text-lg">vs</span>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 mb-1 block">Release B</label>
              <select
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={releaseB}
                onChange={(e) => setReleaseB(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">-- Select release --</option>
                {releases.map((r) => (
                  <option key={r.id} value={r.id} disabled={r.id === releaseA}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {metA && metB && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Metric</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {metA.name}
                    <Badge className={`ml-2 text-[10px] ${STATUS_COLORS[metA.status] ?? ""}`}>{metA.status.replace("_", " ")}</Badge>
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {metB.name}
                    <Badge className={`ml-2 text-[10px] ${STATUS_COLORS[metB.status] ?? ""}`}>{metB.status.replace("_", " ")}</Badge>
                  </th>
                </tr>
              </thead>
              <tbody>
                <MetricRow
                  label="Total Users in Scope"
                  valueA={<span className="font-semibold">{metA.totalUsersInScope.toLocaleString()}</span>}
                  valueB={<span className="font-semibold">{metB.totalUsersInScope.toLocaleString()}</span>}
                />
                <MetricRow
                  label="Personas Generated"
                  valueA={<span className="font-semibold">{metA.personasGenerated}</span>}
                  valueB={<span className="font-semibold">{metB.personasGenerated}</span>}
                />
                <MetricRow
                  label="Personas Mapped (%)"
                  valueA={<span className="font-semibold">{metA.personasMappedPct}%</span>}
                  valueB={<span className="font-semibold">{metB.personasMappedPct}%</span>}
                />
                <MetricRow
                  label="Assignments Approved (%)"
                  valueA={<span className="font-semibold">{metA.assignmentsApprovedPct}%</span>}
                  valueB={<span className="font-semibold">{metB.assignmentsApprovedPct}%</span>}
                />
                <MetricRow
                  label="SOD Conflicts (by severity)"
                  valueA={
                    metA.sodConflictsBySeverity.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {metA.sodConflictsBySeverity.map((s) => (
                          <Badge key={s.severity} variant="outline" className="text-xs">
                            {s.severity}: {s.count}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )
                  }
                  valueB={
                    metB.sodConflictsBySeverity.length > 0 ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        {metB.sodConflictsBySeverity.map((s) => (
                          <Badge key={s.severity} variant="outline" className="text-xs">
                            {s.severity}: {s.count}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )
                  }
                />
                <MetricRow
                  label="Top 5 Unmapped Personas"
                  valueA={
                    metA.topUnmappedPersonas.length > 0 ? (
                      <ul className="text-xs text-left list-disc pl-4">
                        {metA.topUnmappedPersonas.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-emerald-600 text-xs">All mapped</span>
                    )
                  }
                  valueB={
                    metB.topUnmappedPersonas.length > 0 ? (
                      <ul className="text-xs text-left list-disc pl-4">
                        {metB.topUnmappedPersonas.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-emerald-600 text-xs">All mapped</span>
                    )
                  }
                />
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {(releaseA === "" || releaseB === "") && (
        <div className="text-center py-12 text-slate-400">
          <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select two releases above to compare their metrics side by side.</p>
        </div>
      )}
    </div>
  );
}
