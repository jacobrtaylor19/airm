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
import { CheckCircle, CheckCircle2, XCircle, Loader2, Filter, ChevronDown, Building2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { ApprovalRow } from "@/lib/queries";

interface DepartmentStat {
  name: string;
  total: number;
  sodFlagged: number;
}

interface ApprovalsProps {
  queue: ApprovalRow[];
  counts: {
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
  const router = useRouter();

  const isViewer = userRole === "viewer";
  const isMapper = userRole === "mapper";
  const isCoordinator = userRole === "coordinator";
  // Only approvers, admins, and system_admins can approve — mappers can only send back
  const canApprove = !isViewer && !isMapper && !isCoordinator;
  // Mappers can send back assignments to draft for re-editing
  const canSendBack = canApprove || isMapper;

  // Get unique departments
  const departments = Array.from(new Set(queue.map(a => a.department).filter((d): d is string => d !== null))).sort();

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

  function toggleSelect(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    const approvableIds = actionable.filter(a => a.status !== "approved").map(a => a.assignmentId);
    if (selectedIds.length === approvableIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(approvableIds);
    }
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

  // Filter to show actionable items, optionally by department
  const actionable = queue.filter(a =>
    (a.status === "ready_for_approval" ||
    a.status === "compliance_approved" ||
    a.status === "sod_risk_accepted" ||
    a.status === "approved") &&
    (deptFilter === "all" || a.department === deptFilter)
  );

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

      {/* Queue Table */}
      {actionable.length === 0 ? (
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
            <CardTitle className="text-base">Assignments ({actionable.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  {canApprove && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={selectedIds.length > 0 && selectedIds.length === actionable.filter(x => x.status !== "approved").length}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Target Role</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>SOD</TableHead>
                  <TableHead>Status</TableHead>
                  {canSendBack && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionable.map((a) => (
                  <TableRow key={a.assignmentId}>
                    {canApprove && (
                      <TableCell>
                        {a.status !== "approved" && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary"
                            checked={selectedIds.includes(a.assignmentId)}
                            onChange={() => toggleSelect(a.assignmentId)}
                          />
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-sm font-medium">{a.userName}</TableCell>
                    <TableCell className="text-sm">{a.department ?? "—"}</TableCell>
                    <TableCell className="text-sm">{a.personaName ?? "—"}</TableCell>
                    <TableCell className="text-sm">{a.targetRoleName}</TableCell>
                    <TableCell>
                      <ConfidenceBadge score={a.confidenceScore} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {(a.sodConflictCount ?? 0) > 0 ? (
                        <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">{a.sodConflictCount} conflicts</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Clean</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.status} />
                    </TableCell>
                    {canSendBack && (
                      <TableCell>
                        {a.status !== "approved" && (
                          <div className="flex items-center gap-1">
                            {canApprove && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => approveMapping(a.assignmentId)}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" /> Approve
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setSelectedAssignment(a.assignmentId);
                                setSendBackDialog(true);
                              }}
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Send Back
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
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
