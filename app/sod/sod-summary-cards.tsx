"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  ShieldAlert,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";

export interface SodSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  open: number;
  pendingRiskAcceptance: number;
  resolved: number;
}

export function SodSummaryCards({ summary }: { summary: SodSummary }) {
  return (
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
  );
}
