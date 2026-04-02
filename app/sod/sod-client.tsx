"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Filter, Search, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { SodConflictDetailed, WithinRoleViolation } from "@/lib/queries";

import { SodSummaryCards } from "./sod-summary-cards";
import type { SodSummary } from "./sod-summary-cards";
import { ConflictList } from "./conflict-list";
import { ResolutionDialogs } from "./resolution-dialogs";
import type { ConfirmDialogState } from "./resolution-dialogs";
import { SodHeatmap } from "./sod-heatmap";
import { RoleIntegrityTab } from "./role-integrity-tab";

export { type SodSummary } from "./sod-summary-cards";

export function SodPageClient({
  conflicts,
  summary,
  userRole,
  userName,
  withinRoleViolations = [],
}: {
  conflicts: SodConflictDetailed[];
  summary: SodSummary;
  userRole: string | null;
  userName?: string | null;
  withinRoleViolations?: WithinRoleViolation[];
}) {
  const [running, setRunning] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [escalateReason, setEscalateReason] = useState("");
  const [riskJustification, setRiskJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conflictTypeFilter, setConflictTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"conflicts" | "integrity">("conflicts");
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

  async function approveOrRejectRisk(conflictId: number, action: "approve" | "reject", extra?: { mitigatingControl?: string; controlOwner?: string; controlFrequency?: string }) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod/accept-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conflictId,
          action: action === "reject" ? "reject" : undefined,
          justification: riskJustification.trim() || undefined,
          ...(extra ?? {}),
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

  async function remapConflict(conflictId: number) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod/remap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to send to re-mapping queue");
      } else {
        toast.success("Assignment sent to re-mapping queue");
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
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

  if (conflicts.length === 0 && withinRoleViolations.length === 0) {
    return (
      <div className="space-y-6">
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
        <EmptyState
          icon={ShieldCheck}
          title="No SOD conflicts detected"
          description="Run the SOD analysis to check for segregation of duties conflicts across your role mappings. Conflicts will appear here for review and resolution."
          actionLabel="View Mapping"
          actionHref="/mapping"
          actionVariant="teal"
        />
      </div>
    );
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
      <SodSummaryCards summary={summary} />

      {/* Department × Severity Heatmap */}
      <SodHeatmap conflicts={conflicts} />

      {/* Tabs: Conflicts | Role Integrity */}
      {canSeeWithinRole && (
        <div className="flex border-b">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "conflicts"
                ? "border-teal-500 text-teal-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("conflicts")}
          >
            Conflicts
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "integrity"
                ? "border-teal-500 text-teal-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("integrity")}
          >
            Role Integrity
            {withinRoleViolations.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-1.5">
                {withinRoleViolations.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Role Integrity Tab */}
      {activeTab === "integrity" && canSeeWithinRole && (
        <RoleIntegrityTab violations={withinRoleViolations} />
      )}

      {/* Conflicts Tab */}
      {activeTab === "conflicts" && (
      <>
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
      <ConflictList
        filtered={filtered}
        totalConflicts={totalConflicts}
        expandedId={expandedId}
        setExpandedId={setExpandedId}
        canFixMapping={canFixMapping}
        canApproveRisk={canApproveRisk}
        submitting={submitting}
        escalateReason={escalateReason}
        setEscalateReason={setEscalateReason}
        riskJustification={riskJustification}
        setRiskJustification={setRiskJustification}
        onRemoveRole={removeRole}
        onRequestRiskAcceptance={requestRiskAcceptance}
        onApproveOrRejectRisk={approveOrRejectRisk}
        onEscalateToSecurity={escalateToSecurity}
        onRemap={remapConflict}
        onSetConfirmDialog={setConfirmDialog}
        userRole={userRole}
        running={running}
        onRunAnalysis={runAnalysis}
      />
      </>
      )}

      {/* Resolution Dialogs */}
      <ResolutionDialogs
        confirmDialog={confirmDialog}
        setConfirmDialog={setConfirmDialog}
        submitting={submitting}
        riskJustification={riskJustification}
        setRiskJustification={setRiskJustification}
        onRemoveRole={removeRole}
        onApproveOrRejectRisk={approveOrRejectRisk}
      />
    </div>
  );
}
