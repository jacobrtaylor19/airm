"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import type { SodConflictDetailed } from "@/lib/queries";

export interface ConfirmDialogState {
  type: "remove_role" | "approve_risk" | "reject_risk";
  conflict: SodConflictDetailed;
  roleId?: number;
  roleName?: string;
  permissions?: { permissionId: string; permissionName: string | null }[];
}

export interface ResolutionDialogsProps {
  confirmDialog: ConfirmDialogState | null;
  setConfirmDialog: (d: ConfirmDialogState | null) => void;
  submitting: boolean;
  riskJustification: string;
  setRiskJustification: (v: string) => void;
  onRemoveRole: (conflictId: number, removeRoleId: number) => void;
  onApproveOrRejectRisk: (conflictId: number, action: "approve" | "reject", extra?: { mitigatingControl?: string; controlOwner?: string; controlFrequency?: string }) => void;
}

export function ResolutionDialogs({
  confirmDialog,
  setConfirmDialog,
  submitting,
  riskJustification,
  setRiskJustification,
  onRemoveRole,
  onApproveOrRejectRisk,
}: ResolutionDialogsProps) {
  const [showControls, setShowControls] = useState(false);
  const [mitigatingControl, setMitigatingControl] = useState("");
  const [controlOwner, setControlOwner] = useState("");
  const [controlFrequency, setControlFrequency] = useState("");

  function resetControlFields() {
    setShowControls(false);
    setMitigatingControl("");
    setControlOwner("");
    setControlFrequency("");
  }

  return (
    <>
      {/* Confirmation Dialog -- Remove Role */}
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
                  onRemoveRole(confirmDialog.conflict.id, confirmDialog.roleId);
                }
              }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove Role & Resolve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog -- Approve Risk */}
      <Dialog
        open={confirmDialog?.type === "approve_risk"}
        onOpenChange={(open) => { if (!open) { setConfirmDialog(null); resetControlFields(); } }}
      >
        <DialogContent className="sm:max-w-lg">
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

              {/* Mitigating Control Section */}
              <div className="border rounded-md">
                <button
                  type="button"
                  onClick={() => setShowControls(!showControls)}
                  className="flex items-center gap-2 w-full p-3 text-sm font-medium text-left hover:bg-muted/50 transition-colors"
                >
                  {showControls ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  Mitigating Control (recommended)
                </button>
                {showControls && (
                  <div className="px-3 pb-3 space-y-3">
                    <div>
                      <label className="text-xs font-medium">Control Description</label>
                      <textarea
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm min-h-[60px]"
                        value={mitigatingControl}
                        onChange={(e) => setMitigatingControl(e.target.value)}
                        placeholder="What compensating control is in place? (e.g., Monthly reconciliation review by Finance Director)"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Control Owner</label>
                      <Input
                        value={controlOwner}
                        onChange={(e) => setControlOwner(e.target.value)}
                        placeholder="Name or role responsible"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium">Review Frequency</label>
                      <select
                        value={controlFrequency}
                        onChange={(e) => setControlFrequency(e.target.value)}
                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Select frequency...</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annual">Annual</option>
                        <option value="ad_hoc">Ad Hoc</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmDialog(null); resetControlFields(); }}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={submitting}
              onClick={() => {
                if (confirmDialog?.type === "approve_risk") {
                  onApproveOrRejectRisk(confirmDialog.conflict.id, "approve", {
                    mitigatingControl: mitigatingControl || undefined,
                    controlOwner: controlOwner || undefined,
                    controlFrequency: controlFrequency || undefined,
                  });
                  resetControlFields();
                }
              }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve Risk Acceptance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog -- Reject Risk */}
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
                  onApproveOrRejectRisk(confirmDialog.conflict.id, "reject");
                }
              }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject Risk Acceptance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
