"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import type { RemappingQueueItem } from "@/lib/queries";

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export function RemappingQueue({ items }: { items: RemappingQueueItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-indigo-500" />
            Re-mapping Queue
          </CardTitle>
          <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200">
            {items.length} item{items.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          These assignments were returned for role reassignment due to SOD conflicts.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.assignmentId}
            className="flex items-center gap-3 rounded-md border bg-white p-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{item.userName}</span>
                {item.personaName && (
                  <span className="text-xs text-muted-foreground">{item.personaName}</span>
                )}
                <span className="text-xs font-mono text-muted-foreground">{item.roleName}</span>
              </div>
              {item.conflictPermA && item.conflictPermB && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  SOD conflict: <span className="font-mono">{item.conflictPermA}</span>
                  {" "}&times;{" "}
                  <span className="font-mono">{item.conflictPermB}</span>
                </p>
              )}
            </div>
            {item.conflictSeverity && (
              <Badge variant="outline" className={`text-xs ${severityStyles[item.conflictSeverity] ?? ""}`}>
                {item.conflictSeverity}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
              asChild
            >
              <a href={`/mapping?remapAssignment=${item.assignmentId}&userId=${item.userId}&roleId=${item.targetRoleId}`}>
                Remap &rarr;
              </a>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
