"use client";

import { useMemo } from "react";

interface HeatmapProps {
  conflicts: { department: string | null; severity: string; resolutionStatus: string }[];
}

const SEVERITIES = ["critical", "high", "medium", "low"] as const;

function cellColor(count: number, max: number): string {
  if (count === 0) return "bg-muted/30";
  const intensity = max > 0 ? count / max : 0;
  if (intensity > 0.75) return "bg-red-500/90 text-white";
  if (intensity > 0.5) return "bg-orange-500/80 text-white";
  if (intensity > 0.25) return "bg-yellow-500/70 text-white";
  return "bg-yellow-500/30";
}

export function SodHeatmap({ conflicts }: HeatmapProps) {
  const { departments, matrix, maxCount, totals } = useMemo(() => {
    // Build department × severity matrix
    const counts = new Map<string, Record<string, number>>();
    const deptTotals = new Map<string, number>();

    for (const c of conflicts) {
      const dept = c.department || "Unassigned";
      if (!counts.has(dept)) {
        counts.set(dept, { critical: 0, high: 0, medium: 0, low: 0 });
        deptTotals.set(dept, 0);
      }
      const row = counts.get(dept)!;
      if (c.severity in row) {
        row[c.severity]++;
      }
      deptTotals.set(dept, (deptTotals.get(dept) ?? 0) + 1);
    }

    // Sort departments by total conflicts (descending)
    const departments = Array.from(counts.keys()).sort(
      (a, b) => (deptTotals.get(b) ?? 0) - (deptTotals.get(a) ?? 0)
    );

    // Find max for color scaling
    let max = 0;
    Array.from(counts.values()).forEach(row => {
      for (const v of Object.values(row)) {
        if (v > max) max = v;
      }
    });

    return {
      departments,
      matrix: counts,
      maxCount: max,
      totals: deptTotals,
    };
  }, [conflicts]);

  if (departments.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-medium mb-2">SOD Conflict Heatmap</h3>
        <p className="text-sm text-muted-foreground">No conflicts to display.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">SOD Conflict Heatmap</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Low</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-3 rounded-sm bg-yellow-500/30" />
            <div className="w-4 h-3 rounded-sm bg-yellow-500/70" />
            <div className="w-4 h-3 rounded-sm bg-orange-500/80" />
            <div className="w-4 h-3 rounded-sm bg-red-500/90" />
          </div>
          <span>High</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Department</th>
              {SEVERITIES.map(s => (
                <th key={s} className="text-center py-1.5 px-2 font-medium text-muted-foreground capitalize w-20">{s}</th>
              ))}
              <th className="text-center py-1.5 px-2 font-medium text-muted-foreground w-16">Total</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => {
              const row = matrix.get(dept)!;
              return (
                <tr key={dept} className="border-t border-muted/50">
                  <td className="py-1.5 px-2 font-medium truncate max-w-48" title={dept}>{dept}</td>
                  {SEVERITIES.map(s => (
                    <td key={s} className="py-1 px-1 text-center">
                      <div className={`rounded px-2 py-1 font-mono text-xs ${cellColor(row[s], maxCount)}`}>
                        {row[s] || "—"}
                      </div>
                    </td>
                  ))}
                  <td className="py-1.5 px-2 text-center font-bold">{totals.get(dept)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
