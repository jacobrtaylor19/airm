"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ExternalLink,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  Inbox,
  Download,
} from "lucide-react";
import type { SecurityWorkItemDetail } from "@/lib/queries/sod-triage";
import type { WithinRoleViolation } from "@/lib/queries/sod";

interface Props {
  workItems: SecurityWorkItemDetail[];
  roleViolations: WithinRoleViolation[];
}

const severityColor: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-slate-100 text-slate-600",
};

const statusColor: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  wont_fix: "bg-slate-100 text-slate-600",
};

export function SecurityClient({ workItems, roleViolations }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("queue");
  const [completeDialog, setCompleteDialog] = useState<SecurityWorkItemDetail | null>(null);
  const [securityNotes, setSecurityNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const queueItems = workItems.filter((i) => i.status === "open");
  const inProgressItems = workItems.filter((i) => i.status === "in_progress");
  const completedItems = workItems.filter((i) => i.status === "resolved" || i.status === "wont_fix");

  async function handleStartWork(id: number) {
    try {
      const res = await fetch(`/api/sod-triage/work-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Work item started");
      router.refresh();
    } catch {
      toast.error("Failed to update work item");
    }
  }

  async function handleComplete() {
    if (!completeDialog || !securityNotes.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sod-triage/work-items/${completeDialog.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityNotes: securityNotes.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success(`Redesign complete — ${data.affectedAssignmentCount} assignment(s) returned to remapping queue`);
      setCompleteDialog(null);
      setSecurityNotes("");
      router.refresh();
    } catch {
      toast.error("Failed to complete work item");
    } finally {
      setSubmitting(false);
    }
  }

  function renderWorkItem(item: SecurityWorkItemDetail, showActions: boolean) {
    return (
      <Card key={item.id}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              {item.roleName}
              <span className="ml-2 text-xs font-mono text-muted-foreground">{item.roleCode}</span>
            </CardTitle>
            <div className="flex gap-1.5">
              <Badge className={statusColor[item.status] ?? ""}>
                {item.status.replace(/_/g, " ")}
              </Badge>
              <Badge className={severityColor[item.severity] ?? ""}>
                {item.severity}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Conflict:</span>{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{item.permissionA}</code>
            {" × "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{item.permissionB}</code>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Rule:</span> {item.ruleName}
          </div>
          {item.complianceNotes && (
            <div className="text-sm">
              <span className="text-muted-foreground">Compliance Notes:</span>{" "}
              <span className="italic">&ldquo;{item.complianceNotes}&rdquo;</span>
            </div>
          )}
          <div className="text-sm">
            <span className="text-muted-foreground">Affected Users:</span> {item.affectedUserCount}
            {" · "}
            <span className="text-muted-foreground">From:</span> {item.createdByUserName}
          </div>

          {showActions && (
            <div className="flex gap-2 pt-2">
              {item.status === "open" && (
                <Button variant="outline" size="sm" onClick={() => handleStartWork(item.id)}>
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  Start Work
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(`/target-roles?workItemId=${item.id}&roleId=${item.targetRoleId}`, "_self")
                }
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open in Role Designer
              </Button>
              {(item.status === "open" || item.status === "in_progress") && (
                <Button size="sm" onClick={() => setCompleteDialog(item)}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                  Complete Redesign
                </Button>
              )}
            </div>
          )}

          {item.securityNotes && (
            <div className="text-sm mt-2 border-t pt-2">
              <span className="text-muted-foreground">Security Notes:</span>{" "}
              {item.securityNotes}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.href = "/api/exports/security-design";
          }}
        >
          <Download className="h-4 w-4 mr-1.5" />
          Export Role Design
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queue">
            <Inbox className="h-3.5 w-3.5 mr-1.5" />
            Queue ({queueItems.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            In Progress ({inProgressItems.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
            Completed ({completedItems.length})
          </TabsTrigger>
          <TabsTrigger value="health">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Role Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-3 mt-3">
          {queueItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
                <p className="text-sm font-medium">No pending work items</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All role redesign requests have been addressed.
                </p>
              </CardContent>
            </Card>
          ) : (
            queueItems.map((item) => renderWorkItem(item, true))
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-3 mt-3">
          {inProgressItems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No items in progress.
              </CardContent>
            </Card>
          ) : (
            inProgressItems.map((item) => renderWorkItem(item, true))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-3">
          {completedItems.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No completed items yet.
              </CardContent>
            </Card>
          ) : (
            completedItems.map((item) => renderWorkItem(item, false))
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-3 mt-3">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            <strong>Role Health Monitor</strong> — All target roles with unresolved structural
            SOD violations.
          </div>

          {roleViolations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-10 w-10 mx-auto text-emerald-500 mb-3" />
                <p className="text-sm font-medium">All roles are healthy</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No structural violations detected in any target roles.
                </p>
              </CardContent>
            </Card>
          ) : (
            roleViolations.map((v) => (
              <Card key={v.roleId}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{v.roleName}</span>
                      <span className="ml-2 text-xs font-mono text-muted-foreground">
                        {v.roleCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={severityColor[v.worstSeverity] ?? ""}>
                        {v.worstSeverity}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {v.violationCount} violation{v.violationCount !== 1 ? "s" : ""} · {v.affectedUserCount} user{v.affectedUserCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {v.rules.map((r) => (
                      <p key={r.ruleId} className="text-xs text-muted-foreground">
                        {r.ruleName}: <code className="bg-muted px-1 rounded">{r.permissionA}</code> × <code className="bg-muted px-1 rounded">{r.permissionB}</code>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Complete redesign dialog */}
      {completeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold">Complete Redesign</h3>
            <div className="text-sm text-muted-foreground">
              <strong>Role:</strong> {completeDialog.roleName} ({completeDialog.roleCode})
            </div>
            <p className="text-sm text-muted-foreground">
              This will mark the redesign as complete and return all affected assignments to the
              re-mapping queue for mapper review.
            </p>
            <div>
              <label className="text-sm font-medium block mb-1">
                Security Notes (what was changed)
              </label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                value={securityNotes}
                onChange={(e) => setSecurityNotes(e.target.value)}
                placeholder="Describe the changes made to the role definition..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCompleteDialog(null);
                  setSecurityNotes("");
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleComplete}
                disabled={submitting || !securityNotes.trim()}
              >
                {submitting ? "Saving..." : "Complete Redesign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
