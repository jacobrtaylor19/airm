"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { CheckCircle, CheckCircle2, Loader2, Filter, ChevronDown, ChevronRight, Building2, AlertTriangle, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import type { ApprovalRow } from "@/lib/queries";
import { EmptyState } from "@/components/shared/empty-state";

interface DepartmentStat {
  name: string;
  total: number;
  sodFlagged: number;
}

interface UserGroup {
  userId: number;
  userName: string;
  department: string | null;
  personaName: string | null;
  assignments: ApprovalRow[];
  worstStatus: string;
  totalSodConflicts: number;
  avgConfidence: number | null;
}

function groupByUser(rows: ApprovalRow[]): UserGroup[] {
  const map = new Map<number, ApprovalRow[]>();
  for (const row of rows) {
    const existing = map.get(row.userId) || [];
    existing.push(row);
    map.set(row.userId, existing);
  }

  const statusPriority: Record<string, number> = {
    remap_required: 0, sod_rejected: 1, pending_review: 2,
    ready_for_approval: 3, compliance_approved: 4, sod_risk_accepted: 5, approved: 6,
  };

  return Array.from(map.entries()).map(([userId, assignments]) => {
    const first = assignments[0];
    const totalSod = assignments.reduce((sum, a) => sum + (a.sodConflictCount ?? 0), 0);
    const scores = assignments.map(a => a.confidenceScore).filter((s): s is number => s !== null);
    const avgConf = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
    const worstStatus = assignments.reduce((worst, a) =>
      (statusPriority[a.status] ?? 99) < (statusPriority[worst] ?? 99) ? a.status : worst,
      assignments[0].status
    );
    return {
      userId,
      userName: first.userName,
      department: first.department,
      personaName: first.personaName,
      assignments,
      worstStatus,
      totalSodConflicts: totalSod,
      avgConfidence: avgConf,
    };
  }).sort((a, b) => (statusPriority[a.worstStatus] ?? 99) - (statusPriority[b.worstStatus] ?? 99));
}

interface ApprovalsProps {
  queue: ApprovalRow[];
  counts: {
    pendingReview?: number;
    readyForApproval: number;
    approved: number;
    complianceApproved: number;
    sodRiskAccepted: number;
    total: number;
  };
  userRole?: string;
  departmentStats?: DepartmentStat[];
}

export function ApprovalsClient({ queue, counts, userRole, departmentStats = [] }: ApprovalsProps) {
  const [sendBackDialog, setSendBackDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [sendBackReason, setSendBackReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const [deptConfirmDialog, setDeptConfirmDialog] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DepartmentStat | null>(null);
  const [deptApproving, setDeptApproving] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [showApproved, setShowApproved] = useState(false);
  const router = useRouter();

  const isAdmin = ["admin", "system_admin"].includes(userRole ?? "");
  const canApprove = ["approver", "system_admin"].includes(userRole ?? "");
  const canSendBack = canApprove;

  const departments = Array.from(new Set(queue.map(a => a.department).filter((d): d is string => d !== null))).sort();

  function toggleExpandUser(userId: number) {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  }

  async function approveMapping(assignmentId: number) {
    try {
      const res = await fetch("/api/approvals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Approval failed");
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      router.refresh();
    }
  }

  async function approveAllForUser(assignments: ApprovalRow[]) {
    const approvable = assignments.filter(a => ["ready_for_approval", "compliance_approved"].includes(a.status));
    if (approvable.length === 0) return;
    setSubmitting(true);
    let approved = 0;
    for (const a of approvable) {
      try {
        const res = await fetch("/api/approvals/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId: a.assignmentId }),
        });
        if (res.ok) approved++;
      } catch { /* continue */ }
    }
    setSubmitting(false);
    toast.success(`Approved ${approved} role${approved !== 1 ? "s" : ""}`);
    router.refresh();
  }

  async function sendBack() {
    if (!selectedAssignment || !sendBackReason.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/approvals/send-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: selectedAssignment, reason: sendBackReason }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Send back failed");
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
      setSendBackDialog(false);
      setSendBackReason("");
      setSelectedAssignment(null);
      router.refresh();
    }
  }

  async function bulkApprove() {
    setBulkApproving(true);
    try {
      const res = await fetch("/api/approvals/bulk-approve", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bulk approve failed");
      } else {
        toast.success(`Approved ${data.count} assignments.`);
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setBulkApproving(false);
      setSelectedIds([]);
      router.refresh();
    }
  }

  async function approveSelected() {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    let approved = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch("/api/approvals/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignmentId: id }),
        });
        if (res.ok) approved++;
      } catch { /* continue */ }
    }
    setSubmitting(false);
    setSelectedIds([]);
    toast.success(`Approved ${approved} of ${selectedIds.length} selected assignments.`);
    router.refresh();
  }

  function openDeptConfirm(dept: DepartmentStat) {
    setSelectedDept(dept);
    setDeptConfirmDialog(true);
    setDeptDropdownOpen(false);
  }

  async function confirmDeptApprove() {
    if (!selectedDept) return;
    setDeptApproving(true);
    try {
      const res = await fetch("/api/approvals/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department: selectedDept.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Department approval failed");
      } else {
        const msg = data.skippedSod > 0
          ? `Approved ${data.count} assignments for ${selectedDept.name}. ${data.skippedSod} skipped due to unresolved SOD conflicts.`
          : `Approved ${data.count} assignments for ${selectedDept.name}.`;
        toast.success(msg);
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setDeptApproving(false);
      setDeptConfirmDialog(false);
      setSelectedDept(null);
      router.refresh();
    }
  }

  // Split queue: pending (actionable) vs approved
  const visibleStatuses = isAdmin
    ? ["pending_review", "ready_for_approval", "compliance_approved", "sod_risk_accepted"]
    : ["ready_for_approval", "compliance_approved", "sod_risk_accepted"];
  const pendingQueue = queue.filter(a =>
    visibleStatuses.includes(a.status) &&
    (deptFilter === "all" || a.department === deptFilter)
  );
  const approvedQueue = queue.filter(a => a.status === "approved");

  // Group by user
  const pendingGroups = groupByUser(pendingQueue);
  const approvedGroups = groupByUser(approvedQueue);

  if (queue.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No assignments in the approval queue"
        description="Assignments will appear here once personas have been mapped to target roles and submitted for review. Complete the mapping workflow first."
        actionLabel="View Mapping"
        actionHref="/mapping"
        actionVariant="teal"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Ready for Approval</p>
            <p className="text-2xl font-bold text-blue-600">{counts.readyForApproval}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-green-600">{counts.approved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Compliance OK</p>
            <p className="text-2xl font-bold">{counts.complianceApproved}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Risk Accepted</p>
            <p className="text-2xl font-bold text-yellow-600">{counts.sodRiskAccepted}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {departments.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setSelectedIds([]); }}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600"
            >
              <option value="all">All departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
        {canApprove && (
          <>
            <Button onClick={bulkApprove} disabled={bulkApproving || counts.readyForApproval === 0}>
              {bulkApproving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" /> Bulk Approve (High Confidence)</>
              )}
            </Button>
            {departmentStats.length > 0 && (
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Approve All for Department
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
                {deptDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setDeptDropdownOpen(false)} />
                    <div className="absolute top-full left-0 z-50 mt-1 w-72 rounded-md border bg-white shadow-lg py-1">
                      {departmentStats.map((dept) => (
                        <button
                          key={dept.name}
                          className="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-slate-50 text-left"
                          onClick={() => openDeptConfirm(dept)}
                        >
                          <span className="font-medium truncate">{dept.name}</span>
                          <span className="flex items-center gap-2 ml-2 shrink-0">
                            <Badge variant="secondary" className="text-xs">{dept.total}</Badge>
                            {dept.sodFlagged > 0 && (
                              <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">{dept.sodFlagged} SOD</Badge>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {selectedIds.length > 0 && (
              <Button onClick={approveSelected} disabled={submitting} variant="outline">
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Approve Selected ({selectedIds.length})</>
                )}
              </Button>
            )}
            <span className="text-xs text-muted-foreground">
              Bulk approves ready_for_approval assignments with confidence &ge; 85%
            </span>
          </>
        )}
      </div>

      {/* Pending Queue — Grouped by User */}
      {pendingGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 px-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-sm font-semibold text-slate-700 mb-1">No assignments pending approval</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Assignments will appear here once mappers complete role mapping.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Approval ({pendingGroups.length} users, {pendingQueue.length} assignments)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Target Roles</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>SOD</TableHead>
                  <TableHead>Status</TableHead>
                  {canSendBack && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingGroups.map((group) => {
                  const isExpanded = expandedUsers.has(group.userId);
                  const approvableCount = group.assignments.filter(a => ["ready_for_approval", "compliance_approved"].includes(a.status)).length;
                  return (
                    <>
                      {/* User summary row */}
                      <TableRow key={group.userId} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpandUser(group.userId)}>
                        <TableCell className="px-2">
                          {isExpanded
                            ? <ChevronRight className="h-4 w-4 rotate-90 transition-transform text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 transition-transform text-muted-foreground" />
                          }
                        </TableCell>
                        <TableCell className="text-sm font-medium">{group.userName}</TableCell>
                        <TableCell className="text-sm">{group.department ?? "—"}</TableCell>
                        <TableCell className="text-sm">{group.personaName ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {group.assignments.length} role{group.assignments.length !== 1 ? "s" : ""}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <ConfidenceBadge score={group.avgConfidence} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {group.totalSodConflicts > 0 ? (
                            <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">{group.totalSodConflicts} conflicts</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Clean</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={group.worstStatus} />
                        </TableCell>
                        {canSendBack && (
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            {canApprove && approvableCount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => approveAllForUser(group.assignments)}
                                disabled={submitting}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" /> Approve All ({approvableCount})
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>

                      {/* Expanded: individual role assignments */}
                      {isExpanded && group.assignments.map((a) => (
                        <TableRow key={a.assignmentId} className="bg-slate-50/50">
                          <TableCell></TableCell>
                          <TableCell colSpan={2} className="text-xs text-muted-foreground pl-6">
                            Role assignment #{a.assignmentId}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-sm">{a.targetRoleName}</TableCell>
                          <TableCell>
                            <ConfidenceBadge score={a.confidenceScore} />
                          </TableCell>
                          <TableCell className="text-sm">
                            {(a.sodConflictCount ?? 0) > 0 ? (
                              <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">{a.sodConflictCount}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={a.status} />
                          </TableCell>
                          {canSendBack && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {canApprove && ["ready_for_approval", "compliance_approved"].includes(a.status) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[11px]"
                                    onClick={() => approveMapping(a.assignmentId)}
                                  >
                                    Approve
                                  </Button>
                                )}
                                {a.status !== "approved" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[11px]"
                                    onClick={() => {
                                      setSelectedAssignment(a.assignmentId);
                                      setSendBackDialog(true);
                                    }}
                                  >
                                    Send Back
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Approved Section — Collapsible */}
      {approvedGroups.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowApproved(!showApproved)}
          >
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Approved ({approvedGroups.length} users, {approvedQueue.length} assignments)
              </div>
              <ChevronRight className={`h-4 w-4 transition-transform ${showApproved ? "rotate-90" : ""}`} />
            </CardTitle>
          </CardHeader>
          {showApproved && (
            <CardContent className="pt-0">
              <div className="divide-y">
                {approvedGroups.map((group) => (
                  <div key={group.userId} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{group.userName}</span>
                      <span className="text-xs text-muted-foreground">{group.department}</span>
                      <span className="text-xs text-muted-foreground">{group.personaName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {group.assignments.map((a) => (
                        <Badge key={a.assignmentId} variant="outline" className="text-xs border-green-200 text-green-700">
                          {a.targetRoleName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Send Back Dialog */}
      <Dialog open={sendBackDialog} onOpenChange={setSendBackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Back for Revision</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">Reason (required)</label>
            <Input
              value={sendBackReason}
              onChange={(e) => setSendBackReason(e.target.value)}
              placeholder="Explain why this mapping needs revision..."
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendBackDialog(false)}>Cancel</Button>
            <Button onClick={sendBack} disabled={!sendBackReason.trim() || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Bulk Approve Confirmation Dialog */}
      <Dialog open={deptConfirmDialog} onOpenChange={(open) => { if (!open) { setDeptConfirmDialog(false); setSelectedDept(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve All for {selectedDept?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Approve <span className="font-semibold text-foreground">{selectedDept?.total}</span> assignment{selectedDept?.total !== 1 ? "s" : ""} for{" "}
              <span className="font-semibold text-foreground">{selectedDept?.name}</span>?
            </p>
            {(selectedDept?.sodFlagged ?? 0) > 0 && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">
                  <span className="font-semibold">{selectedDept?.sodFlagged}</span> assignment{selectedDept?.sodFlagged !== 1 ? "s have" : " has"} SOD conflict flags.
                  Assignments with unresolved SOD conflicts (no risk acceptance) will be skipped.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeptConfirmDialog(false); setSelectedDept(null); }}>Cancel</Button>
            <Button onClick={confirmDeptApprove} disabled={deptApproving}>
              {deptApproving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" /> Approve Department</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
