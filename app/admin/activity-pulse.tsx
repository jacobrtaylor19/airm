"use client";

import { useState, useEffect } from "react";
import { Activity, Clock, Zap } from "lucide-react";

interface ActivityData {
  last24h: number;
  last7d: number;
  actionsByType: { action: string; count: number }[];
  recentActions: { action: string; entityType: string; actor: string | null; at: string }[];
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityPulse() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/activity-pulse")
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-4 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-3" />
        <div className="h-16 bg-muted rounded" />
      </div>
    );
  }

  if (!data) return null;

  const pulseColor =
    data.last24h > 50 ? "text-emerald-500" :
    data.last24h > 10 ? "text-yellow-500" :
    "text-muted-foreground";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className={`h-4 w-4 ${pulseColor}`} />
        <h3 className="text-sm font-medium">Activity Pulse</h3>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-teal-500/10 p-2">
            <Zap className="h-4 w-4 text-teal-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{data.last24h}</div>
            <div className="text-xs text-muted-foreground">Last 24 hours</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-teal-500/10 p-2">
            <Clock className="h-4 w-4 text-teal-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">{data.last7d}</div>
            <div className="text-xs text-muted-foreground">Last 7 days</div>
          </div>
        </div>
      </div>

      {/* Action Breakdown */}
      {data.actionsByType.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Actions (24h)</h4>
          <div className="space-y-1">
            {data.actionsByType.slice(0, 5).map(a => {
              const maxCount = data.actionsByType[0]?.count ?? 1;
              const width = Math.max((a.count / maxCount) * 100, 8);
              return (
                <div key={a.action} className="flex items-center gap-2 text-xs">
                  <span className="w-28 truncate text-muted-foreground" title={a.action}>{a.action}</span>
                  <div className="flex-1 bg-muted rounded-full h-1.5">
                    <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: `${width}%` }} />
                  </div>
                  <span className="font-mono w-6 text-right">{a.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Actions */}
      {data.recentActions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Latest Actions</h4>
          <div className="space-y-1.5">
            {data.recentActions.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{a.action}</span>
                  <span className="text-muted-foreground truncate">{a.entityType}</span>
                </div>
                <span className="text-muted-foreground whitespace-nowrap ml-2">{timeAgo(a.at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
