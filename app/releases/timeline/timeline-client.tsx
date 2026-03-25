"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users } from "lucide-react";
import type { TimelineRelease } from "./page";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  planning: { label: "Planning", className: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-500" },
};

const BAR_COLORS: Record<string, string> = {
  planning: "bg-slate-300",
  in_progress: "bg-blue-500",
  approved: "bg-emerald-500",
  completed: "bg-green-600",
  archived: "bg-gray-400",
};

function formatDate(iso: string | null): string {
  if (!iso) return "TBD";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

interface TimelineClientProps {
  releases: TimelineRelease[];
}

export function TimelineClient({ releases }: TimelineClientProps) {
  if (releases.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No releases found. Create releases to see the project timeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Project Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

            <div className="space-y-6">
              {releases.map((release) => {
                const badge = STATUS_BADGE[release.status] ?? STATUS_BADGE.planning;
                const barColor = BAR_COLORS[release.status] ?? BAR_COLORS.planning;

                return (
                  <div key={release.id} className="relative pl-14">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-4 top-4 h-5 w-5 rounded-full border-2 border-white shadow ${barColor}`}
                    />

                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      {/* Header row */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{release.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {release.targetDate ? formatDate(release.targetDate) : "No target date"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {release.userCount} users
                            </span>
                          </div>
                        </div>
                        <Badge className={`text-[10px] ${badge.className}`}>{badge.label}</Badge>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Completion</span>
                          <span className="text-xs font-semibold text-slate-700">{release.completionPct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${release.completionPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Date range */}
                      <div className="mt-2 text-[11px] text-slate-400">
                        Created {formatDate(release.createdAt)}
                        {release.completedDate && (
                          <span> &middot; Completed {formatDate(release.completedDate)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
