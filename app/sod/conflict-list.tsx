"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Sparkles,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  XCircle,
  Clock,
  Send,
  Settings2,
  RefreshCw,
} from "lucide-react";
import type { SodConflictDetailed } from "@/lib/queries";

const severityConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  critical: { color: "bg-red-100 text-red-800 border-red-200", icon: <XCircle className="h-3.5 w-3.5" />, label: "Critical" },
  high: { color: "bg-orange-100 text-orange-800 border-orange-200", icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "High" },
  medium: { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <ShieldAlert className="h-3.5 w-3.5" />, label: "Medium" },
  low: { color: "bg-blue-100 text-blue-700 border-blue-200", icon: <ShieldCheck className="h-3.5 w-3.5" />, label: "Low" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  open: { color: "bg-red-50 text-red-700 border-red-200", label: "Open" },
  pending_risk_acceptance: { color: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending Risk Acceptance" },
  risk_accepted: { color: "bg-green-50 text-green-700 border-green-200", label: "Risk Accepted" },
  mapping_fixed: { color: "bg-green-50 text-green-700 border-green-200", label: "Resolved - Mapping Fixed" },
  escalated: { color: "bg-purple-50 text-purple-700 border-purple-200", label: "Escalated" },
  sod_escalated: { color: "bg-purple-50 text-purple-700 border-purple-200", label: "Escalated to S/C" },
  remapping_in_progress: { color: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Remapping" },
};

export interface ConflictListProps {
  filtered: SodConflictDetailed[];
  totalConflicts: number;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  canFixMapping: boolean;
  canApproveRisk: boolean;
  submitting: boolean;
  escalateReason: string;
  setEscalateReason: (v: string) => void;
  riskJustification: string;
  setRiskJustification: (v: string) => void;
  onRemoveRole: (conflictId: number, removeRoleId: number) => void;
  onRequestRiskAcceptance: (conflictId: number) => void;
  onApproveOrRejectRisk: (conflictId: number, action: "approve" | "reject") => void;
  onEscalateToSecurity: (conflictId: number, comment: string) => void;
  onRemap?: (conflictId: number) => void;
  onSetConfirmDialog: (dialog: {
    type: "remove_role" | "approve_risk" | "reject_risk";
    conflict: SodConflictDetailed;
    roleId?: number;
    roleName?: string;
    permissions?: { permissionId: string; permissionName: string | null }[];
  } | null) => void;
  userRole: string | null;
  running: boolean;
  onRunAnalysis: () => void;
}

export function ConflictList({
  filtered,
  totalConflicts,
  expandedId,
  setExpandedId,
  canFixMapping,
  canApproveRisk,
  submitting,
  escalateReason,
  setEscalateReason,
  riskJustification,
  setRiskJustification,
  onRequestRiskAcceptance,
  onEscalateToSecurity,
  onRemap,
  onSetConfirmDialog,
  userRole,
  running,
  onRunAnalysis,
}: ConflictListProps) {
  if (totalConflicts === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
        <ShieldCheck className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-sm font-semibold text-slate-700 mb-1">No SOD conflicts detected</h3>
        <p className="text-sm text-slate-500 max-w-sm mb-4">
          {userRole && ["system_admin", "admin", "mapper"].includes(userRole)
            ? "Run SOD Analysis to check for segregation of duties violations."
            : "No SOD analysis has been run yet. A mapper or admin needs to run the analysis first."}
        </p>
        {userRole && ["system_admin", "admin", "mapper"].includes(userRole) && (
          <Button onClick={onRunAnalysis} disabled={running} className="bg-teal-500 hover:bg-teal-600 text-white">
            {running ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Run SOD Analysis</>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((c) => {
        const isExpanded = expandedId === c.id;
        const sev = severityConfig[c.severity] ?? severityConfig.medium;
        const stat = statusConfig[c.resolutionStatus] ?? { color: "bg-gray-50 text-gray-700 border-gray-200", label: c.resolutionStatus };
        const isResolved = !["open", "pending_risk_acceptance"].includes(c.resolutionStatus);

        return (
          <Card key={c.id} className={isResolved ? "opacity-70" : ""}>
            {/* Conflict Row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => { setExpandedId(isExpanded ? null : c.id); if (!isExpanded) { setEscalateReason(""); setRiskJustification(""); } }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{c.userName}</span>
                  {c.department && (
                    <span className="text-xs text-muted-foreground">{c.department}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  Can both <span className="font-medium text-foreground">{c.permissionNameA ?? c.permissionIdA}</span>
                  {" "}and{" "}
                  <span className="font-medium text-foreground">{c.permissionNameB ?? c.permissionIdB}</span>
                </p>
              </div>

              <Badge variant="outline" className={`text-xs flex items-center gap-1 ${sev.color}`}>
                {sev.icon}
                {sev.label}
              </Badge>

              {c.conflictType === "within_role" ? (
                <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                  Within Role
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 border-slate-200">
                  Between Roles
                </Badge>
              )}

              <span className="text-xs text-muted-foreground hidden md:block max-w-[160px] truncate">
                {c.ruleName}
              </span>

              <Badge variant="outline" className={`text-xs ${stat.color}`}>
                {stat.label}
              </Badge>
              {c.resolutionStatus === "risk_accepted" && c.mitigatingControl && (
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200" title={`${c.mitigatingControl}${c.controlOwner ? ` — Owner: ${c.controlOwner}` : ""}${c.controlFrequency ? ` — ${c.controlFrequency}` : ""}`}>
                  Controlled
                </Badge>
              )}
            </div>

            {/* Expanded Detail Panel */}
            {isExpanded && (
              <div className="border-t px-4 py-4 space-y-4 bg-muted/10">
                {/* Rule Info */}
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">SOD Rule:</span> {c.ruleName}
                  <span className="mx-2">|</span>
                  <span className="font-medium">Permissions:</span> {c.permissionIdA} / {c.permissionIdB}
                </div>

                {/* Risk Explanation */}
                <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                  <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-2">
                    <ShieldX className="h-4 w-4" />
                    Risk Explanation
                  </h4>
                  <p className="text-sm text-red-900/80 whitespace-pre-line">
                    {c.riskExplanation ?? c.ruleDescription ?? "No risk description available."}
                  </p>
                </div>

                {/* Resolution Options — only for open conflicts */}
                {c.resolutionStatus === "open" && c.conflictType === "within_role" && (
                  <div>
                    {/* Structural violation notice */}
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-3">
                      <p className="text-xs text-amber-700">
                        <span className="font-semibold">This conflict is structural</span> — both permissions exist within a single role definition.
                        All users assigned this role are affected. Editing the role definition is required for a permanent fix.
                      </p>
                    </div>

                    <h4 className="text-sm font-semibold mb-3">Within-Role Conflict</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {/* Edit Role Definition */}
                      <Card className="border-slate-200">
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-xs font-semibold text-slate-800">
                            Edit Role Definition
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            The role <span className="font-medium">{c.roleNameA ?? "this role"}</span> must be
                            corrected to remove the conflicting permissions.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7 mt-1"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a href="/target-roles">
                              <Settings2 className="h-3 w-3 mr-1" />
                              Edit Role
                            </a>
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Escalate to Security Team */}
                      <Card className="border-purple-200">
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-xs font-semibold text-purple-800">
                            Escalate to Security Team
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Send this conflict to the Security/GRC team for role redesign.
                          </p>
                          <Input
                            placeholder="Explain why you are escalating (required)..."
                            value={expandedId === c.id ? escalateReason : ""}
                            onChange={(e) => setEscalateReason(e.target.value)}
                            className="text-xs h-7"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs h-7 mt-1 border-purple-300 text-purple-700 hover:bg-purple-50"
                            disabled={!escalateReason.trim() || submitting}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEscalateToSecurity(c.id, escalateReason);
                            }}
                          >
                            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                              <><Send className="h-3 w-3 mr-1" /> Escalate</>
                            )}
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Request Risk Acceptance */}
                      <Card className={`border-amber-200 ${c.severity === "critical" ? "opacity-60" : ""}`}>
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-xs font-semibold text-amber-800">
                            Request Risk Acceptance
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-2">
                          {c.severity === "critical" ? (
                            <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                              Critical conflicts cannot be risk-accepted.
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-muted-foreground">
                                Submit a justification for approver review while the role is being redesigned.
                              </p>
                              <Input
                                placeholder="Business justification (required)..."
                                value={expandedId === c.id ? riskJustification : ""}
                                onChange={(e) => setRiskJustification(e.target.value)}
                                className="text-xs h-7"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs h-7 mt-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                                disabled={!riskJustification.trim() || submitting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestRiskAcceptance(c.id);
                                }}
                              >
                                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit for Approval"}
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Between-role resolution options — only for open between-role conflicts */}
                {c.resolutionStatus === "open" && c.conflictType !== "within_role" && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Resolution Options</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      {/* Option A: Remove Role A */}
                      {c.roleIdA && c.roleNameA && canFixMapping && (
                        <Card className="border-blue-200">
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-xs font-semibold text-blue-800">
                              Option A: Remove {c.roleNameA}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3 space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Removes the role that grants <span className="font-medium">{c.permissionNameA ?? c.permissionIdA}</span>
                            </p>
                            <div className="text-xs">
                              <span className="font-medium">Impact: </span>
                              <span className="text-muted-foreground">
                                {c.roleAPermissions.filter(p => p.permissionId !== c.permissionIdA).length === 0
                                  ? "No other access affected."
                                  : `User will also lose: ${c.roleAPermissions
                                      .filter(p => p.permissionId !== c.permissionIdA)
                                      .map(p => p.permissionName ?? p.permissionId)
                                      .join(", ")}`
                                }
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs h-7 mt-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetConfirmDialog({
                                  type: "remove_role",
                                  conflict: c,
                                  roleId: c.roleIdA!,
                                  roleName: c.roleNameA!,
                                  permissions: c.roleAPermissions,
                                });
                              }}
                            >
                              Remove This Role
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Option B: Remove Role B */}
                      {c.roleIdB && c.roleNameB && canFixMapping && (
                        <Card className="border-blue-200">
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-xs font-semibold text-blue-800">
                              Option B: Remove {c.roleNameB}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3 space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Removes the role that grants <span className="font-medium">{c.permissionNameB ?? c.permissionIdB}</span>
                            </p>
                            <div className="text-xs">
                              <span className="font-medium">Impact: </span>
                              <span className="text-muted-foreground">
                                {c.roleBPermissions.filter(p => p.permissionId !== c.permissionIdB).length === 0
                                  ? "No other access affected."
                                  : `User will also lose: ${c.roleBPermissions
                                      .filter(p => p.permissionId !== c.permissionIdB)
                                      .map(p => p.permissionName ?? p.permissionId)
                                      .join(", ")}`
                                }
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs h-7 mt-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetConfirmDialog({
                                  type: "remove_role",
                                  conflict: c,
                                  roleId: c.roleIdB!,
                                  roleName: c.roleNameB!,
                                  permissions: c.roleBPermissions,
                                });
                              }}
                            >
                              Remove This Role
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      {/* Option C: Request Risk Acceptance */}
                      <Card className={`border-amber-200 ${c.severity === "critical" ? "opacity-60" : ""}`}>
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-xs font-semibold text-amber-800">
                            Option C: Request Risk Acceptance
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 space-y-2">
                          {c.severity === "critical" ? (
                            <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                              Critical conflicts cannot be risk-accepted. You must remove one of the conflicting roles.
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-muted-foreground">
                                Submit a justification for approver review. The conflict will remain until approved.
                              </p>
                              <Input
                                placeholder="Business justification (required)..."
                                value={expandedId === c.id ? riskJustification : ""}
                                onChange={(e) => setRiskJustification(e.target.value)}
                                className="text-xs h-7"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs h-7 mt-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                                disabled={!riskJustification.trim() || submitting}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestRiskAcceptance(c.id);
                                }}
                              >
                                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Submit for Approval"}
                              </Button>
                              <p className="text-xs text-muted-foreground italic">
                                This will be reviewed by your approver
                              </p>
                            </>
                          )}
                        </CardContent>
                      </Card>

                      {/* Option D: Remap */}
                      {onRemap && canFixMapping && (
                        <Card className="border-indigo-200">
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-xs font-semibold text-indigo-800">
                              Option D: Remap
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3 space-y-2">
                            <p className="text-xs text-muted-foreground">
                              Send to Re-mapping Queue to assign a different target role.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-xs h-7 mt-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                              disabled={submitting}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemap(c.id);
                              }}
                            >
                              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                                <><RefreshCw className="h-3 w-3 mr-1" /> Remap</>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {/* Pending Risk Acceptance — approver view */}
                {c.resolutionStatus === "pending_risk_acceptance" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" />
                      Pending Risk Acceptance Review
                    </h4>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Mapper&apos;s Justification: </span>
                        <span className="text-muted-foreground">{c.resolutionNotes || "No justification provided"}</span>
                      </div>

                      {canApproveRisk ? (
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            className="text-xs h-7 bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetConfirmDialog({ type: "approve_risk", conflict: c });
                            }}
                          >
                            Approve Risk
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetConfirmDialog({ type: "reject_risk", conflict: c });
                            }}
                          >
                            Reject Risk
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic mt-2">
                          Waiting for approver review. Only approvers can approve or reject risk acceptance requests.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Resolved Info */}
                {!["open", "pending_risk_acceptance"].includes(c.resolutionStatus) && (
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-4">
                    <h4 className="text-sm font-semibold text-green-800 flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4" />
                      {stat.label}
                    </h4>
                    {c.resolvedBy && (
                      <p className="text-xs text-muted-foreground">
                        Resolved by: {c.resolvedBy}
                      </p>
                    )}
                    {c.resolutionNotes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Notes: {c.resolutionNotes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
