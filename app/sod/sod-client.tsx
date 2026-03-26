"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  Filter,
  Search,
  Send,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { SodConflictDetailed } from "@/lib/queries";

interface SodSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  open: number;
  pendingRiskAcceptance: number;
  resolved: number;
}

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
};

export function SodPageClient({
  conflicts,
  summary,
  userRole,
  userName,
}: {
  conflicts: SodConflictDetailed[];
  summary: SodSummary;
  userRole: string | null;
  userName?: string | null;
}) {
  const [running, setRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "remove_role" | "approve_risk" | "reject_risk";
    conflict: SodConflictDetailed;
    roleId?: number;
    roleName?: string;
    permissions?: { permissionId: string; permissionName: string | null }[];
  } | null>(null);
  const [escalateReason, setEscalateReason] = useState("");
  const [riskJustification, setRiskJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conflictTypeFilter, setConflictTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const isMapper = userRole === "mapper";
  const isApprover = userRole === "approver";
  const isAdmin = userRole === "admin" || userRole === "system_admin";
  const canFixMapping = isMapper || isAdmin;
  const canApproveRisk = isApprover || isAdmin;
  // Security/compliance specialists see within-role conflicts; regular mappers do not
  const securityRoles = ["security.lead", "compliance.officer"];
  const canSeeWithinRole = isAdmin || isApprover || (isMapper && securityRoles.includes(userName ?? ""));

  // Filtering
  const filtered = conflicts.filter((c) => {
    // Within-role conflicts are routed to security/compliance — hide from regular mappers
    if (!canSeeWithinRole && c.conflictType === "within_role") return false;
    if (severityFilter !== "all" && c.severity !== severityFilter) return false;
    if (statusFilter !== "all" && c.resolutionStatus !== statusFilter) return false;
    if (conflictTypeFilter !== "all" && c.conflictType !== conflictTypeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.userName.toLowerCase().includes(q) ||
        (c.department ?? "").toLowerCase().includes(q) ||
        c.ruleName.toLowerCase().includes(q) ||
        (c.permissionNameA ?? "").toLowerCase().includes(q) ||
        (c.permissionNameB ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalConflicts = conflicts.length;

  async function runAnalysis() {
    setRunning(true);
    try {
      const res = await fetch("/api/sod/analyze", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(`SOD analysis failed: ${data.error}`);
      } else {
        const data = await res.json();
        toast.success(`Analysis complete: ${data.conflictsFound} conflicts found across ${data.usersAnalyzed} users`);
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  async function removeRole(conflictId: number, removeRoleId: number) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod/fix-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId, removeRoleId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to fix mapping");
      } else {
        toast.success("Role removed and conflict resolved");
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
      setConfirmDialog(null);
      setExpandedId(null);
      router.refresh();
    }
  }

  async function requestRiskAcceptance(conflictId: number) {
    if (!riskJustification.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod/request-risk-acceptance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId, justification: riskJustification.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to submit risk acceptance request");
      } else {
        toast.success("Risk acceptance request submitted for approver review");
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
      setRiskJustification("");
      setEscalateReason("");
      setExpandedId(null);
      router.refresh();
    }
  }

  async function approveOrRejectRisk(conflictId: number, action: "approve" | "reject") {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod/accept-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictId,
          action: action === "reject" ? "reject" : undefined,
          justification: riskJustification.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || `Failed to ${action} risk`);
      } else {
        toast.success(action === "approve" ? "Risk acceptance approved" : "Risk acceptance rejected");
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
      setConfirmDialog(null);
      setRiskJustification("");
      setEscalateReason("");
      setExpandedId(null);
      router.refresh();
    }
  }

  async function escalateToSecurity(conflictId: number, comment: string) {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId, comment: comment.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to escalate conflict");
      } else {
        toast.success("Conflict escalated to Security/GRC team for review");
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
      setExpandedId(null);
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      {userRole && ["system_admin", "admin", "mapper"].includes(userRole) && (
        <div className="flex items-center gap-3">
          <Button onClick={runAnalysis} disabled={running} size="sm" className="bg-teal-500 hover:bg-teal-600 text-white">
            {running ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Run SOD Analysis</>
            )}
          </Button>
        </div>
      )}

      {/* Summary Cards */}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending_risk_acceptance">Pending Review</SelectItem>
            <SelectItem value="risk_accepted">Risk Accepted</SelectItem>
            <SelectItem value="mapping_fixed">Mapping Fixed</SelectItem>
            <SelectItem value="escalated">Escalated</SelectItem>
          </SelectContent>
        </Select>
        <Select value={conflictTypeFilter} onValueChange={setConflictTypeFilter}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Conflict Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="between_role">Between Roles</SelectItem>
            <SelectItem value="within_role">Within Role</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search user, department, rule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[220px] h-8 text-xs pl-9"
          />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          Showing {filtered.length} of {totalConflicts} conflicts
        </span>
      </div>

      {/* Conflicts List */}
      {totalConflicts === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
          <ShieldCheck className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No SOD conflicts detected</h3>
          <p className="text-sm text-slate-500 max-w-sm mb-4">
            {userRole && ["system_admin", "admin", "mapper"].includes(userRole)
              ? "Run SOD Analysis to check for segregation of duties violations."
              : "No SOD analysis has been run yet. A mapper or admin needs to run the analysis first."}
          </p>
          {userRole && ["system_admin", "admin", "mapper"].includes(userRole) && (
            <Button onClick={runAnalysis} disabled={running} className="bg-teal-500 hover:bg-teal-600 text-white">
              {running ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Run SOD Analysis</>
              )}
            </Button>
          )}
        </div>
      ) : (
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
                        <h4 className="text-sm font-semibold mb-3">Within-Role Conflict</h4>
                        <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 mb-3">
                          <p className="text-sm text-purple-900/80">
                            This role contains conflicting permissions and needs to be reviewed by the Security/GRC team.
                            The role <strong>{c.roleNameA ?? "this role"}</strong> includes both{" "}
                            <strong>{c.permissionNameA ?? c.permissionIdA}</strong> and{" "}
                            <strong>{c.permissionNameB ?? c.permissionIdB}</strong>, which violate segregation of duties.
                            The role itself must be redesigned or split — removing the role from one user does not fix the underlying issue.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {/* Escalate to Security Team */}
                          <Card className="border-purple-200">
                            <CardHeader className="py-3 px-4">
                              <CardTitle className="text-xs font-semibold text-purple-800">
                                Escalate to Security Team
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-3 space-y-2">
                              <p className="text-xs text-muted-foreground">
                                Send this conflict to the Security/GRC team for role redesign. They will review
                                and split the role to eliminate the inherent conflict.
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
                                  escalateToSecurity(c.id, escalateReason);
                                }}
                              >
                                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                                  <><Send className="h-3 w-3 mr-1" /> Escalate to Security Team</>
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
                                      requestRiskAcceptance(c.id);
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
                                    setConfirmDialog({
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
                                    setConfirmDialog({
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
                                      requestRiskAcceptance(c.id);
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
                                  setConfirmDialog({ type: "approve_risk", conflict: c });
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
                                  setConfirmDialog({ type: "reject_risk", conflict: c });
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
                    {isResolved && (
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
      )}

      {/* Confirmation Dialog — Remove Role */}
      <Dialog
        open={confirmDialog?.type === "remove_role"}
        onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Removal</DialogTitle>
          </DialogHeader>
          {confirmDialog?.type === "remove_role" && (
            <div className="space-y-3">
              <p className="text-sm">
                Are you sure you want to remove <strong>{confirmDialog.roleName}</strong> from{" "}
                <strong>{confirmDialog.conflict.userName}</strong>?
              </p>
              {confirmDialog.permissions && confirmDialog.permissions.length > 0 && (
                <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                  <p className="text-sm font-medium text-amber-800 mb-1">They will lose access to:</p>
                  <ul className="text-xs text-amber-700 space-y-0.5">
                    {confirmDialog.permissions.map((p) => (
                      <li key={p.permissionId}>
                        {p.permissionName ?? p.permissionId} ({p.permissionId})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => {
                if (confirmDialog?.type === "remove_role" && confirmDialog.roleId) {
                  removeRole(confirmDialog.conflict.id, confirmDialog.roleId);
                }
              }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove Role & Resolve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog — Approve Risk */}
      <Dialog
        open={confirmDialog?.type === "approve_risk"}
        onOpenChange={(open) => { if (!open) setConfirmDialog(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Risk Acceptance</DialogTitle>
          </DialogHeader>
          {confirmDialog?.type === "approve_risk" && (
            <div className="space-y-3">
              <div className="text-sm">
                <p><strong>User:</strong> {confirmDialog.conflict.userName}</p>
                <p><strong>Rule:</strong> {confirmDialog.conflict.ruleName}</p>
                <p><strong>Severity:</strong> {confirmDialog.conflict.severity}</p>
              </div>
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Mapper&apos;s Justification:</p>
                <p className="text-muted-foreground">{confirmDialog.conflict.resolutionNotes}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={submitting}
              onClick={() => {
                if (confirmDialog?.type === "approve_risk") {
                  approveOrRejectRisk(confirmDialog.conflict.id, "approve");
                }
              }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve Risk Acceptance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog — Reject Risk */}
      <Dialog
        open={confirmDialog?.type === "reject_risk"}
        onOpenChange={(open) => { if (!open) { setConfirmDialog(null); setRiskJustification(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Risk Acceptance</DialogTitle>
          </DialogHeader>
          {confirmDialog?.type === "reject_risk" && (
            <div className="space-y-3">
              <div className="text-sm">
                <p><strong>User:</strong> {confirmDialog.conflict.userName}</p>
                <p><strong>Rule:</strong> {confirmDialog.conflict.ruleName}</p>
              </div>
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Mapper&apos;s Justification:</p>
                <p className="text-muted-foreground">{confirmDialog.conflict.resolutionNotes}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Reason for rejection (optional)</label>
                <Input
                  value={riskJustification}
                  onChange={(e) => setRiskJustification(e.target.value)}
                  placeholder="Explain why this risk cannot be accepted..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmDialog(null); setRiskJustification(""); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => {
                if (confirmDialog?.type === "reject_risk") {
                  approveOrRejectRisk(confirmDialog.conflict.id, "reject");
                }
              }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject Risk Acceptance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
