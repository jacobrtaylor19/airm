"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, CheckCircle, Clock, Archive, Zap, Trash2, Pencil, Star, CalendarClock, ChevronDown, ChevronRight, Circle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type ReleaseStats = { total: number; approved: number; sodFlagged: number; pending: number; pct: number; userCount: number; orgUnitCount: number };

type ReleaseRow = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  releaseType: string;
  targetSystem: string | null;
  targetDate: string | null;
  completedDate: string | null;
  isActive: boolean | null;
  mappingDeadline: string | null;
  reviewDeadline: string | null;
  approvalDeadline: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  stats: ReleaseStats;
};

interface Props {
  releases: ReleaseRow[];
  unlinkedCount: number;
  isAdmin: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  planning:    { label: "Planning",    color: "bg-zinc-100 text-zinc-700",    icon: <Clock className="h-3.5 w-3.5" /> },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700",   icon: <Zap className="h-3.5 w-3.5" /> },
  approved:    { label: "Approved",    color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  completed:   { label: "Completed",   color: "bg-green-100 text-green-700", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  archived:    { label: "Archived",    color: "bg-zinc-100 text-zinc-500",   icon: <Archive className="h-3.5 w-3.5" /> },
};

const TYPE_LABELS: Record<string, string> = {
  initial: "Initial Migration",
  incremental: "Incremental",
  remediation: "Remediation",
};

const EMPTY_FORM = {
  name: "",
  description: "",
  status: "planning",
  releaseType: "initial",
  targetSystem: "",
  targetDate: "",
  mappingDeadline: "",
  reviewDeadline: "",
  approvalDeadline: "",
  isActive: false,
};

interface ReadinessCheck {
  label: string;
  passed: boolean;
  severity: "error" | "warning" | "info";
  detail?: string;
}

function getReadinessChecks(r: ReleaseRow): ReadinessCheck[] {
  const now = new Date();
  const checks: ReadinessCheck[] = [];

  // 1. Scope defined
  checks.push({
    label: "Scope defined (users or business units)",
    passed: r.stats.userCount > 0 || r.stats.orgUnitCount > 0,
    severity: "error",
    detail: r.stats.userCount > 0 || r.stats.orgUnitCount > 0
      ? `${r.stats.userCount} users, ${r.stats.orgUnitCount} business units`
      : "No users or business units assigned to this release",
  });

  // 2. Assignments exist
  checks.push({
    label: "Role assignments created",
    passed: r.stats.total > 0,
    severity: "error",
    detail: r.stats.total > 0 ? `${r.stats.total} assignments` : "No role assignments yet",
  });

  // 3. SOD analysis complete (no flagged or all resolved)
  checks.push({
    label: "SOD conflicts resolved",
    passed: r.stats.sodFlagged === 0,
    severity: r.stats.sodFlagged > 5 ? "error" : "warning",
    detail: r.stats.sodFlagged > 0 ? `${r.stats.sodFlagged} unresolved conflicts` : "All clear",
  });

  // 4. Approval progress
  const approvalPct = r.stats.total > 0 ? Math.round((r.stats.approved / r.stats.total) * 100) : 0;
  checks.push({
    label: "All assignments approved",
    passed: r.stats.total > 0 && approvalPct === 100,
    severity: approvalPct < 50 ? "error" : "warning",
    detail: `${approvalPct}% approved (${r.stats.approved}/${r.stats.total})`,
  });

  // 5. No pending assignments
  checks.push({
    label: "No assignments in draft/pending",
    passed: r.stats.pending === 0,
    severity: "warning",
    detail: r.stats.pending > 0 ? `${r.stats.pending} still pending` : "All submitted",
  });

  // 6. Target date set
  checks.push({
    label: "Target go-live date set",
    passed: !!r.targetDate,
    severity: "info",
  });

  // 7. Mapping deadline not overdue
  if (r.mappingDeadline) {
    const overdue = new Date(r.mappingDeadline) < now;
    checks.push({
      label: "Mapping deadline met",
      passed: !overdue || r.stats.total > 0,
      severity: overdue ? "warning" : "info",
      detail: overdue ? `Overdue since ${new Date(r.mappingDeadline).toLocaleDateString()}` : undefined,
    });
  }

  // 8. Approval deadline not overdue
  if (r.approvalDeadline) {
    const overdue = new Date(r.approvalDeadline) < now && approvalPct < 100;
    checks.push({
      label: "Approval deadline met",
      passed: !overdue,
      severity: overdue ? "error" : "info",
      detail: overdue ? `Overdue since ${new Date(r.approvalDeadline).toLocaleDateString()}` : undefined,
    });
  }

  return checks;
}

function ReadinessChecklist({ release }: { release: ReleaseRow }) {
  const [expanded, setExpanded] = useState(false);
  const checks = getReadinessChecks(release);
  const passed = checks.filter(c => c.passed).length;
  const total = checks.length;
  const allPassed = passed === total;
  const errors = checks.filter(c => !c.passed && c.severity === "error").length;

  return (
    <div className="mt-2 pt-2 border-t border-dashed">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs w-full text-left hover:bg-muted/50 rounded px-1 py-0.5 transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="font-medium">Readiness</span>
        <span className={`font-mono ${allPassed ? "text-emerald-600" : errors > 0 ? "text-red-600" : "text-yellow-600"}`}>
          {passed}/{total}
        </span>
        {!allPassed && errors > 0 && (
          <AlertCircle className="h-3 w-3 text-red-500" />
        )}
        {allPassed && (
          <CheckCircle className="h-3 w-3 text-emerald-500" />
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1 pl-1">
          {checks.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {c.passed ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              ) : (
                <Circle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${c.severity === "error" ? "text-red-500" : c.severity === "warning" ? "text-yellow-500" : "text-muted-foreground"}`} />
              )}
              <div>
                <span className={c.passed ? "text-muted-foreground" : ""}>{c.label}</span>
                {c.detail && <span className="text-muted-foreground ml-1">— {c.detail}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReleasesClient({ releases, unlinkedCount, isAdmin }: Props) {
  const router = useRouter();
  const [showDialog, setShowDialog] = useState(false);
  const [editRelease, setEditRelease] = useState<ReleaseRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function openCreate() {
    setEditRelease(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }

  function openEdit(r: ReleaseRow) {
    setEditRelease(r);
    setForm({
      name: r.name,
      description: r.description ?? "",
      status: r.status,
      releaseType: r.releaseType,
      targetSystem: r.targetSystem ?? "",
      targetDate: r.targetDate ?? "",
      mappingDeadline: r.mappingDeadline ?? "",
      reviewDeadline: r.reviewDeadline ?? "",
      approvalDeadline: r.approvalDeadline ?? "",
      isActive: r.isActive ?? false,
    });
    setShowDialog(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Release name is required"); return; }
    setSaving(true);
    try {
      const method = editRelease ? "PUT" : "POST";
      const body = editRelease
        ? { id: editRelease.id, ...form }
        : form;
      const res = await fetch("/api/releases", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
      } else {
        toast.success(editRelease ? "Release updated" : "Release created");
        setShowDialog(false);
        router.refresh();
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  async function setActive(r: ReleaseRow) {
    try {
      const res = await fetch("/api/releases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, isActive: true }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`"${r.name}" is now the active release`);
      router.refresh();
    } catch {
      toast.error("Failed to set active release");
    }
  }

  async function deleteRelease(r: ReleaseRow) {
    if (!confirm(`Delete "${r.name}"? Assignments will be unlinked (not deleted).`)) return;
    setDeletingId(r.id);
    try {
      const res = await fetch(`/api/releases?id=${r.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Release deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete release");
    } finally {
      setDeletingId(null);
    }
  }

  const activeRelease = releases.find((r) => r.isActive);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Releases</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Migration waves — each release tracks a set of user role assignments through the approval workflow.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Release
          </Button>
        )}
      </div>

      {/* Active release banner */}
      {activeRelease && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-3 flex items-center gap-3">
          <Star className="h-4 w-4 text-blue-600 shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-blue-800">Active release:</span>{" "}
            <span className="text-blue-700">{activeRelease.name}</span>
            {activeRelease.targetSystem && (
              <span className="text-blue-500 ml-2">· {activeRelease.targetSystem}</span>
            )}
          </div>
          <Badge variant="outline" className="ml-auto text-xs border-blue-300 text-blue-600">
            {activeRelease.stats.total} assignments
          </Badge>
        </div>
      )}

      {unlinkedCount > 0 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50/50 px-4 py-2.5 text-sm text-yellow-800">
          <strong>{unlinkedCount}</strong> assignments are not linked to any release (imported before releases were tracked).
        </div>
      )}

      {/* Release cards */}
      {releases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Zap className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-muted-foreground">{isAdmin ? "No releases yet. Create your first migration wave." : "No releases are currently in scope for your assignment."}</p>
            {isAdmin && <Button variant="outline" onClick={openCreate}>Create Release</Button>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {releases.map((r) => {
            const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.planning;
            return (
              <Card key={r.id} className={`transition-colors ${r.isActive ? "border-blue-300 shadow-sm" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-base truncate">{r.name}</span>
                        {r.isActive && (
                          <Badge className="text-[10px] px-1.5 bg-blue-600 text-white">Active</Badge>
                        )}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.color}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                          {TYPE_LABELS[r.releaseType] ?? r.releaseType}
                        </span>
                        {r.targetSystem && (
                          <span className="text-xs text-muted-foreground">{r.targetSystem}</span>
                        )}
                      </div>

                      {r.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                      )}

                      {r.targetDate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Target: {new Date(r.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}

                      {/* Phase deadlines */}
                      {(r.mappingDeadline || r.reviewDeadline || r.approvalDeadline) && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <CalendarClock className="h-3 w-3 shrink-0" />
                          {r.mappingDeadline && (
                            <span className={new Date(r.mappingDeadline) < new Date() ? "text-red-600 font-medium" : ""}>
                              Mapping: {new Date(r.mappingDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                          {r.reviewDeadline && (
                            <span className={new Date(r.reviewDeadline) < new Date() ? "text-red-600 font-medium" : ""}>
                              Review: {new Date(r.reviewDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                          {r.approvalDeadline && (
                            <span className={new Date(r.approvalDeadline) < new Date() ? "text-red-600 font-medium" : ""}>
                              Approval: {new Date(r.approvalDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: stats */}
                    <div className="shrink-0 text-right hidden sm:block">
                      <div className="text-2xl font-bold tabular-nums">{r.stats.pct}%</div>
                      <div className="text-xs text-muted-foreground">approved</div>
                    </div>
                  </div>

                  {/* Stats row */}
                  {r.stats.total > 0 && (
                    <div className="mt-3">
                      {/* Progress bar */}
                      <div className="flex h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                        {r.stats.approved > 0 && (
                          <div className="h-full bg-emerald-500" style={{ width: `${(r.stats.approved / r.stats.total) * 100}%` }} />
                        )}
                        {r.stats.sodFlagged > 0 && (
                          <div className="h-full bg-red-400" style={{ width: `${(r.stats.sodFlagged / r.stats.total) * 100}%` }} />
                        )}
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="tabular-nums"><strong className="text-foreground">{r.stats.total}</strong> assignments</span>
                        <span className="tabular-nums text-emerald-700"><strong>{r.stats.approved}</strong> approved</span>
                        {r.stats.sodFlagged > 0 && (
                          <span className="tabular-nums text-red-600"><strong>{r.stats.sodFlagged}</strong> SOD flagged</span>
                        )}
                        <span className="tabular-nums"><strong>{r.stats.pending}</strong> pending</span>
                      </div>
                    </div>
                  )}

                  {/* Scope info */}
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {r.stats.orgUnitCount > 0 && (
                      <span><strong className="text-foreground">{r.stats.orgUnitCount}</strong> business unit{r.stats.orgUnitCount !== 1 ? "s" : ""} in scope</span>
                    )}
                    {r.stats.userCount > 0 && (
                      <span><strong className="text-foreground">{r.stats.userCount}</strong> user{r.stats.userCount !== 1 ? "s" : ""} in scope</span>
                    )}
                    {r.stats.orgUnitCount === 0 && r.stats.userCount === 0 && isAdmin && (
                      <span className="text-yellow-600">No scope defined yet — add business units or users</span>
                    )}
                  </div>

                  {/* Readiness Checklist */}
                  <ReadinessChecklist release={r} />

                  {/* Actions (admin only) */}
                  {isAdmin && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {!r.isActive && r.status !== "archived" && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setActive(r)}>
                          <Star className="h-3 w-3" /> View
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openEdit(r)}>
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-destructive hover:text-destructive ml-auto"
                        onClick={() => deleteRelease(r)}
                        disabled={deletingId === r.id}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRelease ? "Edit Release" : "New Release"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Release Name *</label>
              <Input
                placeholder="e.g. Wave 1 — Finance Go-Live"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="Brief description of scope..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Type</label>
                <Select value={form.releaseType} onValueChange={(v) => setForm((f) => ({ ...f, releaseType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial">Initial Migration</SelectItem>
                    <SelectItem value="incremental">Incremental</SelectItem>
                    <SelectItem value="remediation">Remediation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Target System</label>
                <Input
                  placeholder="SAP S/4HANA"
                  value={form.targetSystem}
                  onChange={(e) => setForm((f) => ({ ...f, targetSystem: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Target Date</label>
                <Input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Phase Deadlines */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                Phase Deadlines
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Mapping</label>
                  <Input
                    type="date"
                    value={form.mappingDeadline}
                    onChange={(e) => setForm((f) => ({ ...f, mappingDeadline: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Review</label>
                  <Input
                    type="date"
                    value={form.reviewDeadline}
                    onChange={(e) => setForm((f) => ({ ...f, reviewDeadline: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Approval</label>
                  <Input
                    type="date"
                    value={form.approvalDeadline}
                    onChange={(e) => setForm((f) => ({ ...f, approvalDeadline: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border"
              />
              <label htmlFor="isActive" className="text-sm">
                Set as active release <span className="text-muted-foreground">(new assignments will be linked here)</span>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : editRelease ? "Save Changes" : "Create Release"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
