"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldX,
  ShieldAlert,
  XCircle,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface SodConflict {
  id: number;
  severity: string;
  ruleName: string;
  ruleDescription: string | null;
  riskExplanation: string | null;
  resolutionStatus: string;
  permissionIdA: string | null;
  permissionIdB: string | null;
  roleIdA: number | null;
  roleIdB: number | null;
  roleNameA: string | null;
  roleNameB: string | null;
}

const severityConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  critical: { color: "bg-red-100 text-red-800", icon: <XCircle className="h-3.5 w-3.5" /> },
  high: { color: "bg-orange-100 text-orange-800", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  medium: { color: "bg-yellow-100 text-yellow-700", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
  low: { color: "bg-blue-100 text-blue-700", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
};

const statusLabels: Record<string, string> = {
  open: "Open",
  pending_risk_acceptance: "Pending Risk Acceptance",
  risk_accepted: "Risk Accepted",
  mapping_fixed: "Mapping Fixed",
  escalated: "Escalated",
};

export function UserSodConflicts({
  conflicts,
}: {
  conflicts: SodConflict[];
  userId: number;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [justification, setJustification] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "remove_role" | "request_risk" | "escalate";
    conflict: SodConflict;
    roleId?: number;
    roleName?: string;
  } | null>(null);
  const router = useRouter();

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
      router.refresh();
    }
  }

  async function requestRiskAcceptance(conflictId: number) {
    if (!justification.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod/request-risk-acceptance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId, justification: justification.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to submit risk acceptance request");
      } else {
        toast.success("Risk acceptance request submitted");
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
      setJustification("");
      setConfirmDialog(null);
      router.refresh();
    }
  }

  async function escalateConflict(conflictId: number) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to escalate conflict");
      } else {
        toast.success("Conflict escalated to Security/GRC team");
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
      setConfirmDialog(null);
      router.refresh();
    }
  }

  // No conflicts
  if (conflicts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" /> SOD Conflicts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span>No SOD conflicts detected for this user.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const openCount = conflicts.filter(c => c.resolutionStatus === "open" || c.resolutionStatus === "pending_risk_acceptance").length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> SOD Conflicts ({conflicts.length})
            {openCount > 0 && (
              <Badge variant="destructive" className="text-xs ml-2">{openCount} unresolved</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {conflicts.map((c) => {
              const sev = severityConfig[c.severity] ?? severityConfig.medium;
              const isOpen = c.resolutionStatus === "open";
              const isPending = c.resolutionStatus === "pending_risk_acceptance";
              const isResolved = !isOpen && !isPending;

              return (
                <div
                  key={c.id}
                  className={`rounded-lg border p-4 text-sm ${isResolved ? "opacity-60" : ""}`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`text-xs ${sev.color}`}>
                        <span className="mr-1">{sev.icon}</span>
                        {c.severity}
                      </Badge>
                      <span className="font-medium">{c.ruleName}</span>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {statusLabels[c.resolutionStatus] ?? c.resolutionStatus}
                    </Badge>
                  </div>

                  {/* Risk explanation */}
                  {(c.ruleDescription || c.riskExplanation) && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {c.riskExplanation || c.ruleDescription}
                    </p>
                  )}

                  {/* Conflicting permissions/roles */}
                  <div className="flex items-center gap-2 text-xs mb-3">
                    <div className="rounded bg-muted px-2 py-1">
                      <span className="font-mono">{c.permissionIdA}</span>
                      {c.roleNameA && <span className="text-muted-foreground ml-1">({c.roleNameA})</span>}
                    </div>
                    <ShieldX className="h-3.5 w-3.5 text-red-400" />
                    <div className="rounded bg-muted px-2 py-1">
                      <span className="font-mono">{c.permissionIdB}</span>
                      {c.roleNameB && <span className="text-muted-foreground ml-1">({c.roleNameB})</span>}
                    </div>
                  </div>

                  {/* Resolution actions — only for open conflicts */}
                  {isOpen && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {c.roleIdA && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() =>
                            setConfirmDialog({
                              type: "remove_role",
                              conflict: c,
                              roleId: c.roleIdA!,
                              roleName: c.roleNameA ?? `Role ${c.roleIdA}`,
                            })
                          }
                        >
                          Remove {c.roleNameA ?? "Role A"}
                        </Button>
                      )}
                      {c.roleIdB && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() =>
                            setConfirmDialog({
                              type: "remove_role",
                              conflict: c,
                              roleId: c.roleIdB!,
                              roleName: c.roleNameB ?? `Role ${c.roleIdB}`,
                            })
                          }
                        >
                          Remove {c.roleNameB ?? "Role B"}
                        </Button>
                      )}
                      {c.severity !== "critical" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() =>
                            setConfirmDialog({ type: "request_risk", conflict: c })
                          }
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Request Risk Acceptance
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() =>
                          setConfirmDialog({ type: "escalate", conflict: c })
                        }
                      >
                        Escalate
                      </Button>
                    </div>
                  )}

                  {isPending && (
                    <div className="pt-2 border-t text-xs text-amber-700">
                      Awaiting approver review for risk acceptance.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <Dialog open onOpenChange={() => { setConfirmDialog(null); setJustification(""); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirmDialog.type === "remove_role" && `Remove Role: ${confirmDialog.roleName}`}
                {confirmDialog.type === "request_risk" && "Request Risk Acceptance"}
                {confirmDialog.type === "escalate" && "Escalate to Security/GRC"}
              </DialogTitle>
            </DialogHeader>

            <div className="text-sm space-y-3">
              <p className="text-muted-foreground">
                {confirmDialog.type === "remove_role" &&
                  `This will remove the target role "${confirmDialog.roleName}" from this user to resolve the SOD conflict "${confirmDialog.conflict.ruleName}".`}
                {confirmDialog.type === "request_risk" &&
                  `Submit a risk acceptance request for the SOD conflict "${confirmDialog.conflict.ruleName}". An approver will need to review and approve.`}
                {confirmDialog.type === "escalate" &&
                  `Escalate the SOD conflict "${confirmDialog.conflict.ruleName}" to the Security/GRC team for further review.`}
              </p>

              {confirmDialog.type === "request_risk" && (
                <Textarea
                  placeholder="Provide a business justification for accepting this risk..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  rows={3}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setConfirmDialog(null); setJustification(""); }}
              >
                Cancel
              </Button>
              <Button
                variant={confirmDialog.type === "remove_role" ? "destructive" : "default"}
                disabled={submitting || (confirmDialog.type === "request_risk" && !justification.trim())}
                onClick={() => {
                  if (confirmDialog.type === "remove_role" && confirmDialog.roleId) {
                    removeRole(confirmDialog.conflict.id, confirmDialog.roleId);
                  } else if (confirmDialog.type === "request_risk") {
                    requestRiskAcceptance(confirmDialog.conflict.id);
                  } else if (confirmDialog.type === "escalate") {
                    escalateConflict(confirmDialog.conflict.id);
                  }
                }}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {confirmDialog.type === "remove_role" && "Remove Role"}
                {confirmDialog.type === "request_risk" && "Submit Request"}
                {confirmDialog.type === "escalate" && "Escalate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
