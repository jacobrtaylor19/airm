"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ListChecks } from "lucide-react";
import type { TargetRoleRow } from "@/lib/queries";

export interface AutoMapProgressProps {
  userRole?: string;
  autoMapping: boolean;
  autoMapProgress: { processed: number; total: number } | null;
  bulkMode: boolean;
  bulkSelected: Set<number>;
  bulkTargetRoleId: number | null;
  bulkAssigning: boolean;
  targetRoles: TargetRoleRow[];
  personaIds: number[];
  onAutoMapAll: () => void;
  onToggleBulkMode: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onSetBulkTargetRoleId: (id: number | null) => void;
  onBulkAssign: () => void;
}

export function AutoMapProgress({
  userRole,
  autoMapping,
  autoMapProgress,
  bulkMode,
  bulkSelected,
  bulkTargetRoleId,
  bulkAssigning,
  targetRoles,
  onAutoMapAll,
  onToggleBulkMode,
  onSetBulkTargetRoleId,
  onBulkAssign,
}: AutoMapProgressProps) {
  if (!userRole || !["system_admin", "admin", "mapper"].includes(userRole)) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      <div className="flex items-center gap-3">
        <Button onClick={onAutoMapAll} disabled={autoMapping || bulkMode} className="bg-teal-500 hover:bg-teal-600 text-white">
          {autoMapping ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Auto-Mapping...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Auto-Map All (Least Access)</>
          )}
        </Button>
        {autoMapping && autoMapProgress && autoMapProgress.total > 0 && (
          <div className="flex items-center gap-2 min-w-[200px]">
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((autoMapProgress.processed / autoMapProgress.total) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {autoMapProgress.processed}/{autoMapProgress.total}
            </span>
          </div>
        )}
      </div>
      <Button variant={bulkMode ? "default" : "outline"} onClick={onToggleBulkMode} disabled={autoMapping}>
        <ListChecks className="h-4 w-4 mr-2" /> {bulkMode ? "Exit Bulk Mode" : "Bulk Assign"}
      </Button>
      {bulkMode && (
        <div className="flex items-center gap-3 flex-wrap rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
          <Badge variant="secondary" className="text-xs font-semibold">
            {bulkSelected.size} persona{bulkSelected.size !== 1 ? "s" : ""} selected
          </Badge>
          <div className="h-4 w-px bg-border" />
          <select
            value={bulkTargetRoleId ?? ""}
            onChange={(e) => onSetBulkTargetRoleId(e.target.value ? parseInt(e.target.value) : null)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm min-w-[200px]"
          >
            <option value="">Select target role...</option>
            {targetRoles.map(r => (
              <option key={r.id} value={r.id}>{r.roleName}</option>
            ))}
          </select>
          <Button onClick={onBulkAssign} disabled={bulkAssigning || !bulkTargetRoleId || bulkSelected.size === 0}>
            {bulkAssigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Assign to Selected
          </Button>
          {bulkSelected.size === 0 && (
            <span className="text-xs text-muted-foreground">
              Use checkboxes in the persona list or filter then Select All
            </span>
          )}
        </div>
      )}
    </div>
  );
}
