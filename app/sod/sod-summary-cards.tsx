"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  ShieldAlert,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
} from "lucide-react";

export interface SodSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  open: number;
  pendingRiskAcceptance: number;
  resolved: number;
  withinRole: number;
  betweenRole: number;
}

export function SodSummaryCards({ summary }: { summary: SodSummary }) {
  return (
    <>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card className="border-red-200">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary.critical}</p>
        </CardContent>
      </Card>
      <Card className="border-orange-200">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <p className="text-xs text-muted-foreground">High</p>
          </div>
          <p className="text-2xl font-bold text-orange-600 mt-1">{summary.high}</p>
        </CardContent>
      </Card>
      <Card className="border-yellow-200">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-yellow-500" />
            <p className="text-xs text-muted-foreground">Medium</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600 mt-1">{summary.medium}</p>
        </CardContent>
      </Card>
      <Card className="border-amber-200">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-1">{summary.pendingRiskAcceptance}</p>
        </CardContent>
      </Card>
      <Card className="border-green-200">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <p className="text-xs text-muted-foreground">Resolved</p>
          </div>
          <p className="text-2xl font-bold text-green-600 mt-1">{summary.resolved}</p>
        </CardContent>
      </Card>
    </div>
    {(summary.withinRole > 0 || summary.betweenRole > 0) && (
      <Card className="border-slate-200 mt-3">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-slate-500" />
            <p className="text-xs font-medium text-muted-foreground">Conflict Origin</p>
          </div>
          <div className="flex items-center gap-4">
            {summary.withinRole > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-sm font-semibold text-amber-700">{summary.withinRole}</span>
                <span className="text-xs text-muted-foreground">structural (within-role)</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-sm font-semibold text-blue-700">{summary.betweenRole}</span>
              <span className="text-xs text-muted-foreground">cross-assignment (between-role)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )}
    </>
  );
}
