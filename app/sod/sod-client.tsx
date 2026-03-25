"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Play, CheckCircle, Wrench } from "lucide-react";
import type { SodConflictRow } from "@/lib/queries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SodSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  open: number;
  resolved: number;
}

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

export function SodPageClient({
  conflicts,
  summary,
  userRole,
}: {
  conflicts: SodConflictRow[];
  summary: SodSummary;
  userRole: string | null;
}) {
  const [running, setRunning] = useState(false);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<SodConflictRow | null>(null);
  const [justification, setJustification] = useState("");
  const [selectedRemoveRoleId, setSelectedRemoveRoleId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const isMapper = userRole === "mapper";
  const isAdmin = userRole === "admin";

  async function runAnalysis() {
    setRunning(true);
    try {
      const res = await fetch("/api/sod/analyze", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(`SOD analysis failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  async function acceptRisk() {
    if (!selectedConflict || !justification.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod/accept-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId: selectedConflict.id, justification }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to accept risk");
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
      setRiskDialogOpen(false);
      setJustification("");
      setSelectedConflict(null);
      router.refresh();
    }
  }

  async function escalateConflict(conflictId: number) {
    try {
      const res = await fetch("/api/sod/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to escalate");
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      router.refresh();
    }
  }

  async function fixMapping() {
    if (!selectedConflict || !selectedRemoveRoleId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sod/fix-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conflictId: selectedConflict.id, removeRoleId: Number(selectedRemoveRoleId) }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to fix mapping");
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSubmitting(false);
      setFixDialogOpen(false);
      setSelectedRemoveRoleId("");
      setSelectedConflict(null);
      router.refresh();
    }
  }

  const totalConflicts = summary.critical + summary.high + summary.medium + summary.low;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center gap-3">
        <Button onClick={runAnalysis} disabled={running}>
          {running ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
          ) : (
            <><Play className="h-4 w-4 mr-2" /> Run SOD Analysis</>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Critical</p>
            <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">High</p>
            <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Medium</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.medium}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Low</p>
            <p className="text-2xl font-bold text-blue-600">{summary.low}</p>
          </CardContent>
        </Card>
      </div>

      {/* Conflicts Table */}
      {totalConflicts === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-muted-foreground text-center">
              No SOD conflicts detected. Run the SOD analysis after mapping target roles to check for conflicts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Conflicts ({totalConflicts}) — {summary.open} open, {summary.resolved} resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Conflicting Permissions</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conflicts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium">{c.userName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${severityColors[c.severity] ?? ""}`}>
                        {c.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.ruleName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.permissionIdA} / {c.permissionIdB}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.roleNameA ?? "—"} / {c.roleNameB ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{c.resolutionStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.resolutionStatus === "open" && (
                        <div className="flex items-center gap-1">
                          {/* Fix Mapping — mappers and admins */}
                          {(isMapper || isAdmin) && (c.roleIdA || c.roleIdB) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setSelectedConflict(c);
                                setSelectedRemoveRoleId("");
                                setFixDialogOpen(true);
                              }}
                            >
                              <Wrench className="h-3 w-3 mr-1" />
                              Fix Mapping
                            </Button>
                          )}
                          {/* Accept Risk — approvers and admins only, NOT mappers */}
                          {!isMapper && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={c.severity === "critical"}
                              title={c.severity === "critical" ? "Critical conflicts cannot be risk-accepted" : "Accept risk with justification"}
                              onClick={() => {
                                setSelectedConflict(c);
                                setRiskDialogOpen(true);
                              }}
                            >
                              Accept Risk
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => escalateConflict(c.id)}
                          >
                            Escalate
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

      {/* Accept Risk Dialog */}
      <Dialog open={riskDialogOpen} onOpenChange={setRiskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept SOD Risk</DialogTitle>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-3">
              <div className="text-sm">
                <p><strong>User:</strong> {selectedConflict.userName}</p>
                <p><strong>Rule:</strong> {selectedConflict.ruleName}</p>
                <p><strong>Conflicting Permissions:</strong> {selectedConflict.permissionIdA} / {selectedConflict.permissionIdB}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Justification (required)</label>
                <Input
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain why this risk is acceptable..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiskDialogOpen(false)}>Cancel</Button>
            <Button onClick={acceptRisk} disabled={!justification.trim() || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept Risk"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fix Mapping Dialog */}
      <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix Mapping — Remove Conflicting Role</DialogTitle>
          </DialogHeader>
          {selectedConflict && (
            <div className="space-y-3">
              <div className="text-sm">
                <p><strong>User:</strong> {selectedConflict.userName}</p>
                <p><strong>Rule:</strong> {selectedConflict.ruleName}</p>
                <p><strong>Conflicting Permissions:</strong> {selectedConflict.permissionIdA} / {selectedConflict.permissionIdB}</p>
              </div>
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                Select which conflicting target role to remove from this user. This will delete the
                user&apos;s assignment to that role and resolve the SOD conflict.
              </div>
              <div>
                <label className="text-sm font-medium">Role to remove</label>
                <Select value={selectedRemoveRoleId} onValueChange={setSelectedRemoveRoleId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a role to remove..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedConflict.roleIdA && (
                      <SelectItem value={String(selectedConflict.roleIdA)}>
                        {selectedConflict.roleNameA ?? `Role #${selectedConflict.roleIdA}`}
                      </SelectItem>
                    )}
                    {selectedConflict.roleIdB && (
                      <SelectItem value={String(selectedConflict.roleIdB)}>
                        {selectedConflict.roleNameB ?? `Role #${selectedConflict.roleIdB}`}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFixDialogOpen(false)}>Cancel</Button>
            <Button onClick={fixMapping} disabled={!selectedRemoveRoleId || submitting} variant="destructive">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove Role & Resolve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
