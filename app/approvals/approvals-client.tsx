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
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { ApprovalRow } from "@/lib/queries";

interface ApprovalsProps {
  queue: ApprovalRow[];
  counts: {
    readyForApproval: number;
    approved: number;
    complianceApproved: number;
    sodRiskAccepted: number;
    total: number;
  };
}

export function ApprovalsClient({ queue, counts }: ApprovalsProps) {
  const [sendBackDialog, setSendBackDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<number | null>(null);
  const [sendBackReason, setSendBackReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  const router = useRouter();

  async function approveMapping(assignmentId: number) {
    try {
      const res = await fetch("/api/approvals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Approval failed");
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
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
        alert(data.error || "Send back failed");
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
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
        alert(data.error || "Bulk approve failed");
      } else {
        alert(`Approved ${data.count} assignments.`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setBulkApproving(false);
      router.refresh();
    }
  }

  // Filter to show actionable items
  const actionable = queue.filter(a =>
    a.status === "ready_for_approval" ||
    a.status === "compliance_approved" ||
    a.status === "sod_risk_accepted" ||
    a.status === "approved"
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

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={bulkApprove} disabled={bulkApproving || counts.readyForApproval === 0}>
          {bulkApproving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
          ) : (
            <><CheckCircle className="h-4 w-4 mr-2" /> Bulk Approve (High Confidence)</>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          Approves ready_for_approval assignments with confidence &ge; 85%
        </span>
      </div>

      {/* Queue Table */}
      {actionable.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <p className="text-muted-foreground text-center">
              No assignments in the approval queue. Run the pipeline to generate target role mappings first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignments ({actionable.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Target Role</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>SOD</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actionable.map((a) => (
                  <TableRow key={a.assignmentId}>
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
                    <TableCell>
                      {a.status === "ready_for_approval" && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => approveMapping(a.assignmentId)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
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
    </div>
  );
}
