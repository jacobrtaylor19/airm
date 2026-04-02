"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, ChevronDown, ChevronRight, AlertTriangle, Users, Settings2 } from "lucide-react";
import type { WithinRoleViolation } from "@/lib/queries";

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export function RoleIntegrityTab({ violations }: { violations: WithinRoleViolation[] }) {
  const [expandedRoleId, setExpandedRoleId] = useState<number | null>(null);

  if (violations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
        <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
        <h3 className="text-sm font-semibold text-slate-700 mb-1">No structural role violations detected</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          All SOD conflicts are cross-assignment. No role definitions contain inherent permission conflicts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Callout banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Structural violations require role redesign.</p>
            <p className="text-sm text-amber-800/80 mt-1">
              These conflicts are embedded in the role definition itself — every user assigned this role inherits
              the violation. Removing the role from affected users is a temporary measure; the role permissions
              must be corrected to resolve these findings permanently.
            </p>
          </div>
        </div>
      </div>

      {/* Violations table */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-8 px-3 py-2"></th>
              <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground">Role</th>
              <th className="px-3 py-2 text-center font-medium text-xs text-muted-foreground">Violations</th>
              <th className="px-3 py-2 text-center font-medium text-xs text-muted-foreground">Affected Users</th>
              <th className="px-3 py-2 text-center font-medium text-xs text-muted-foreground">Worst Severity</th>
              <th className="px-3 py-2 text-right font-medium text-xs text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v) => {
              const isExpanded = expandedRoleId === v.roleId;
              return (
                <tr key={v.roleId} className="border-b last:border-0">
                  <td className="px-3 py-2" colSpan={6}>
                    <div
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted/30 -mx-3 -my-2 px-3 py-2 transition-colors"
                      onClick={() => setExpandedRoleId(isExpanded ? null : v.roleId)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{v.roleName}</span>
                        <span className="ml-2 text-xs font-mono text-muted-foreground">{v.roleCode}</span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums w-16 text-center">{v.violationCount}</span>
                      <div className="flex items-center gap-1 w-24 justify-center">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-semibold tabular-nums">{v.affectedUserCount}</span>
                      </div>
                      <div className="w-24 text-center">
                        <Badge variant="outline" className={`text-xs ${severityStyles[v.worstSeverity] ?? severityStyles.medium}`}>
                          {v.worstSeverity}
                        </Badge>
                      </div>
                      <div className="w-28 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a href="/target-roles">
                            <Settings2 className="h-3 w-3 mr-1" />
                            Edit Role
                          </a>
                        </Button>
                      </div>
                    </div>

                    {/* Expanded: show rules */}
                    {isExpanded && (
                      <div className="mt-3 ml-8 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Conflicting Permissions ({v.rules.length} rule{v.rules.length !== 1 ? "s" : ""})
                        </p>
                        {v.rules.map((rule) => (
                          <div key={rule.ruleId} className="rounded border border-slate-200 bg-slate-50/50 p-3 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{rule.ruleName}</span>
                              <Badge variant="outline" className={`text-xs ${severityStyles[rule.severity] ?? severityStyles.medium}`}>
                                {rule.severity}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground">
                              <span className="font-mono">{rule.permissionA}</span>
                              {rule.permissionNameA && <span className="ml-1">({rule.permissionNameA})</span>}
                              <span className="mx-2 text-slate-400">&times;</span>
                              <span className="font-mono">{rule.permissionB}</span>
                              {rule.permissionNameB && <span className="ml-1">({rule.permissionNameB})</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
