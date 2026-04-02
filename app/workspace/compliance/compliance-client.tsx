"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertTriangle,
  Send,
  BookX,
  ShieldCheck,
  History,
  Scale,
} from "lucide-react";
import type { ComplianceQueueItem } from "@/lib/queries/sod-triage";

interface Props {
  queue: ComplianceQueueItem[];
  history: ComplianceQueueItem[];
}

const severityColor: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-slate-100 text-slate-600",
};

export function ComplianceClient({ queue, history }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("queue");
  const [dialogState, setDialogState] = useState<{
    type: "redesign" | "ruleset" | "risk" | null;
    item: ComplianceQueueItem | null;
  }>({ type: null, item: null });
  const [formText, setFormText] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleRouteToSecurity() {
    if (!dialogState.item || !formText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod-triage/route-to-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sodConflictId: dialogState.item.conflictId,
          targetRoleId: dialogState.item.roleId,
          complianceNotes: formText.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Routed to security for redesign");
      closeDialog();
      router.refresh();
    } catch {
      toast.error("Failed to route to security");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRuleset() {
    if (!dialogState.item || !formText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod-triage/update-ruleset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sodConflictId: dialogState.item.conflictId,
          sodRuleId: dialogState.item.ruleId,
          justification: formText.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("SOD rule deactivated");
      closeDialog();
      router.refresh();
    } catch {
      toast.error("Failed to update ruleset");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcceptRisk() {
    if (!dialogState.item || !formText.trim() || !expiryDate) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod-triage/accept-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sodConflictId: dialogState.item.conflictId,
          justification: formText.trim(),
          expiryDate,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Risk accepted at design level");
      closeDialog();
      router.refresh();
    } catch {
      toast.error("Failed to accept risk");
    } finally {
      setSubmitting(false);
    }
  }

  function closeDialog() {
    setDialogState({ type: null, item: null });
    setFormText("");
    setExpiryDate("");
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queue">
            <Scale className="h-3.5 w-3.5 mr-1.5" />
            Active Queue ({queue.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-3.5 w-3.5 mr-1.5" />
            History ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-3 mt-3">
          {queue.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShieldCheck className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
                <p className="text-sm font-medium">No structural violations awaiting review</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All within-role SOD conflicts have been addressed.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                <strong>Structural violations require role redesign.</strong>{" "}
                These conflicts are embedded in the role definition itself — every user assigned
                this role inherits the violation.
              </div>

              {queue.map((item) => (
                <Card key={item.conflictId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">
                        {item.roleName}
                        <span className="ml-2 text-xs font-mono text-muted-foreground">
                          {item.roleCode}
                        </span>
                      </CardTitle>
                      <Badge className={severityColor[item.severity] ?? ""}>
                        {item.severity}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">SOD Rule:</span>{" "}
                      {item.ruleName}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Conflicting Permissions:</span>{" "}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{item.permissionA}</code>
                      {" × "}
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">{item.permissionB}</code>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Affected Users:</span>{" "}
                      {item.affectedUserCount}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogState({ type: "ruleset", item })}
                      >
                        <BookX className="h-3.5 w-3.5 mr-1.5" />
                        Update Ruleset
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogState({ type: "redesign", item })}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        Send for Redesign
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogState({ type: "risk", item })}
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                        Accept Risk
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-3">
          {history.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No resolved items yet.</p>
              </CardContent>
            </Card>
          ) : (
            history.map((item) => (
              <Card key={item.conflictId}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{item.roleName}</span>
                      <span className="ml-2 text-xs font-mono text-muted-foreground">
                        {item.roleCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {item.resolutionStatus.replace(/_/g, " ")}
                      </Badge>
                      <Badge className={severityColor[item.severity] ?? ""}>
                        {item.severity}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.ruleName}: {item.permissionA} × {item.permissionB}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog overlay */}
      {dialogState.type && dialogState.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold">
              {dialogState.type === "redesign" && "Send for Redesign"}
              {dialogState.type === "ruleset" && "Update Ruleset"}
              {dialogState.type === "risk" && "Accept Risk"}
            </h3>

            <div className="text-sm text-muted-foreground">
              <strong>Role:</strong> {dialogState.item.roleName} ({dialogState.item.roleCode})
              <br />
              <strong>Rule:</strong> {dialogState.item.ruleName}
            </div>

            {dialogState.type === "ruleset" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                This will deactivate the rule for all future SOD analysis. Existing conflicts
                will be re-evaluated on next run.
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-1">
                {dialogState.type === "redesign" ? "Compliance Notes" : "Justification"}
              </label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder={
                  dialogState.type === "redesign"
                    ? "Describe the compliance concern for the security team..."
                    : "Provide justification..."
                }
              />
            </div>

            {dialogState.type === "risk" && (
              <div>
                <label className="text-sm font-medium block mb-1">Expiry Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closeDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (dialogState.type === "redesign") handleRouteToSecurity();
                  else if (dialogState.type === "ruleset") handleUpdateRuleset();
                  else if (dialogState.type === "risk") handleAcceptRisk();
                }}
                disabled={submitting || !formText.trim() || (dialogState.type === "risk" && !expiryDate)}
              >
                {submitting ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
