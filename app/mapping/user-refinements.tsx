"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CheckCircle, ChevronRight, Loader2, Search, X, Save, Send, Plus, Undo2, RefreshCw } from "lucide-react";
import type { TargetRoleRow, GapRow, GapAnalysisSummary, UserRefinementDetail } from "@/lib/queries";

// -----------------------------------------------
// Helpers
// -----------------------------------------------

function getUserStatus(u: UserRefinementDetail): string {
  const currentWave = u.allAssignments.filter(a => a.releasePhase !== "existing");
  if (currentWave.length === 0) return "none";
  const statuses = currentWave.map(a => a.status);
  if (statuses.some(s => s === "remap_required")) return "remap_required";
  if (statuses.some(s => s === "sod_rejected")) return "sod_rejected";
  if (statuses.every(s => s === "approved")) return "approved";
  if (statuses.some(s => s === "compliance_approved" || s === "ready_for_approval")) return "sod_clean";
  if (statuses.some(s => s === "pending_review")) return "pending_review";
  return "draft";
}

function isRemappedUser(u: UserRefinementDetail): boolean {
  return u.allAssignments.some(a => a.status === "remap_required");
}

function StatusBadgeInline({ status, isRemap }: { status: string; isRemap?: boolean }) {
  switch (status) {
    case "draft": return (
      <span className="flex items-center gap-1">
        <Badge variant="outline" className="text-xs bg-slate-50">Draft</Badge>
        {isRemap && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200"><RefreshCw className="h-2.5 w-2.5 mr-0.5" />Remapped</Badge>}
      </span>
    );
    case "remap_required": return <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200"><RefreshCw className="h-2.5 w-2.5 mr-0.5" />Remap Required</Badge>;
    case "pending_review": return <Badge className="text-xs bg-teal-100 text-teal-700 border-teal-200">Pending Review</Badge>;
    case "sod_clean": return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">SOD Clean</Badge>;
    case "sod_rejected": return <Badge className="text-xs bg-red-100 text-red-700 border-red-200">SOD Conflict</Badge>;
    case "approved": return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Approved</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

// -----------------------------------------------
// RefinementsTab
// -----------------------------------------------

export interface RefinementsTabProps {
  refinementDetails: UserRefinementDetail[];
  targetRoles: TargetRoleRow[];
  refinementCount?: number;
  totalUsersWithAssignments: number;
  userRole?: string;
}

export function RefinementsTab({
  refinementDetails,
  targetRoles,
  totalUsersWithAssignments,
  userRole,
}: RefinementsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editRoles, setEditRoles] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [roleDomainFilter, setRoleDomainFilter] = useState<string>("all");
  const [sendingBack, setSendingBack] = useState(false);
  // Local state for optimistic updates — start from props, update locally on submit
  const [localDetails, setLocalDetails] = useState(refinementDetails);
  const router = useRouter();

  const isExecutor = userRole && ["system_admin", "admin", "mapper"].includes(userRole);
  const selectedUser = localDetails.find(u => u.userId === selectedUserId);

  // Unique departments for filter
  const departments = Array.from(new Set(localDetails.map(u => u.department).filter((d): d is string => d !== null))).sort();

  // Status counts
  const statusCounts = localDetails.reduce((acc, u) => {
    const s = getUserStatus(u);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter users
  const filteredDetails = localDetails.filter(u => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!u.userName.toLowerCase().includes(q) &&
          !(u.department ?? "").toLowerCase().includes(q) &&
          !(u.personaName ?? "").toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== "all" && getUserStatus(u) !== statusFilter) return false;
    if (deptFilter !== "all" && u.department !== deptFilter) return false;
    return true;
  });

  const draftUsers = filteredDetails.filter(u => getUserStatus(u) === "draft");

  function openUserPanel(userId: number) {
    const user = localDetails.find(u => u.userId === userId);
    if (user) {
      setSelectedUserId(userId);
      setEditRoles(user.allAssignments.map(a => a.targetRoleId));
    }
  }

  function toggleRole(roleId: number) {
    setEditRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  }

  function toggleSelect(userId: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function saveRefinements() {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/refinements/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.userId,
          targetRoleIds: editRoles,
          personaId: selectedUser.personaId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save changes");
      } else {
        toast.success("Changes saved successfully");
        setSelectedUserId(null);
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSaving(false);
      router.refresh();
    }
  }

  async function submitUserForReview(userId: number) {
    setSubmittingSingle(true);
    try {
      const user = localDetails.find(u => u.userId === userId);
      if (!user) return;
      const draftIds = user.allAssignments.filter(a => a.status === "draft").map(a => a.assignmentId);
      if (draftIds.length === 0) { toast.error("No draft assignments to submit"); return; }
      const res = await fetch("/api/mapping/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentIds: draftIds }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to submit"); return; }
      // Optimistic update: immediately move user out of Draft status in local state
      setLocalDetails(prev => prev.map(u =>
        u.userId === userId
          ? { ...u, allAssignments: u.allAssignments.map(a => a.status === "draft" ? { ...a, status: "pending_review" } : a) }
          : u
      ));
      toast.success(`${data.updated} assignment${data.updated === 1 ? "" : "s"} submitted for review`);
      router.refresh();
    } catch { toast.error("Failed to submit"); }
    finally { setSubmittingSingle(false); }
  }

  async function bulkSubmitForReview() {
    setSubmittingBulk(true);
    try {
      const allDraftIds: number[] = [];
      const selectedArr = Array.from(selectedIds);
      for (const userId of selectedArr) {
        const user = localDetails.find(u => u.userId === userId);
        if (user) {
          allDraftIds.push(...user.allAssignments.filter(a => a.status === "draft").map(a => a.assignmentId));
        }
      }
      if (allDraftIds.length === 0) { toast.error("No draft assignments in selection"); return; }
      const res = await fetch("/api/mapping/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentIds: allDraftIds }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to submit"); return; }
      // Optimistic update: move all selected users out of Draft
      const submitted = new Set(selectedArr);
      setLocalDetails(prev => prev.map(u =>
        submitted.has(u.userId)
          ? { ...u, allAssignments: u.allAssignments.map(a => a.status === "draft" ? { ...a, status: "pending_review" } : a) }
          : u
      ));
      toast.success(`${data.updated} assignment${data.updated === 1 ? "" : "s"} submitted for review`);
      setSelectedIds(new Set());
      router.refresh();
    } catch { toast.error("Failed to submit"); }
    finally { setSubmittingBulk(false); }
  }

  async function sendBackToDraft(userId: number) {
    setSendingBack(true);
    try {
      const user = localDetails.find(u => u.userId === userId);
      if (!user) return;
      const pendingIds = user.allAssignments
        .filter(a => a.status === "pending_review" || a.status === "compliance_approved" || a.status === "ready_for_approval")
        .map(a => a.assignmentId);
      if (pendingIds.length === 0) { toast.error("No assignments to send back"); return; }
      const res = await fetch("/api/approvals/send-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentIds: pendingIds, reason: "Sent back by mapper for re-editing" }),
      });
      if (!res.ok) { const data = await res.json(); toast.error(data.error || "Failed to send back"); return; }
      // Optimistic update
      setLocalDetails(prev => prev.map(u =>
        u.userId === userId
          ? { ...u, allAssignments: u.allAssignments.map(a => ["pending_review", "compliance_approved", "ready_for_approval"].includes(a.status) ? { ...a, status: "draft" } : a) }
          : u
      ));
      toast.success("Assignments sent back to Draft for editing");
      router.refresh();
    } catch { toast.error("Failed to send back"); }
    finally { setSendingBack(false); }
  }

  const selectedUserStatus = selectedUser ? getUserStatus(selectedUser) : "none";
  const isEditable = selectedUserStatus === "draft";

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className={statusFilter === "all" ? "ring-1 ring-primary" : "cursor-pointer hover:bg-muted/30"} onClick={() => setStatusFilter("all")}>
          <CardContent className="pt-3 pb-2">
            <p className="text-xs text-muted-foreground">Total Assigned</p>
            <p className="text-xl font-bold mt-0.5">{totalUsersWithAssignments}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === "draft" ? "ring-1 ring-primary" : "cursor-pointer hover:bg-muted/30"} onClick={() => setStatusFilter("draft")}>
          <CardContent className="pt-3 pb-2">
            <p className="text-xs text-muted-foreground">Draft</p>
            <p className="text-xl font-bold mt-0.5">{statusCounts["draft"] || 0}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === "pending_review" ? "ring-1 ring-primary" : "cursor-pointer hover:bg-muted/30"} onClick={() => setStatusFilter("pending_review")}>
          <CardContent className="pt-3 pb-2">
            <p className="text-xs text-muted-foreground">Pending Review</p>
            <p className="text-xl font-bold mt-0.5 text-teal-600">{statusCounts["pending_review"] || 0}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === "sod_rejected" ? "ring-1 ring-primary" : "cursor-pointer hover:bg-muted/30"} onClick={() => setStatusFilter("sod_rejected")}>
          <CardContent className="pt-3 pb-2">
            <p className="text-xs text-muted-foreground">SOD Conflicts</p>
            <p className="text-xl font-bold mt-0.5 text-red-600">{statusCounts["sod_rejected"] || 0}</p>
          </CardContent>
        </Card>
        <Card className={statusFilter === "sod_clean" ? "ring-1 ring-primary" : "cursor-pointer hover:bg-muted/30"} onClick={() => setStatusFilter("sod_clean")}>
          <CardContent className="pt-3 pb-2">
            <p className="text-xs text-muted-foreground">SOD Clean</p>
            <p className="text-xl font-bold mt-0.5 text-emerald-600">{(statusCounts["sod_clean"] || 0) + (statusCounts["approved"] || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: search + filters + bulk actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users, departments, personas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm h-8"
        >
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {isExecutor && selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-teal-300 text-teal-700 hover:bg-teal-50"
            onClick={bulkSubmitForReview}
            disabled={submittingBulk}
          >
            {submittingBulk ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
            Submit {selectedIds.size} for Review
          </Button>
        )}
        {isExecutor && draftUsers.length > 0 && selectedIds.size === 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => setSelectedIds(new Set(draftUsers.map(u => u.userId)))}
          >
            Select All Draft ({draftUsers.length})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: User list */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {filteredDetails.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {refinementDetails.length === 0
                  ? "No users with target role assignments yet. Run auto-mapping from the Persona Mapping tab first."
                  : "No users match your filters."}
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isExecutor && (
                        <TableHead className="w-8">
                          {draftUsers.length > 0 && (
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 accent-primary"
                              checked={selectedIds.size > 0 && selectedIds.size === draftUsers.length}
                              onChange={() => {
                                if (selectedIds.size === draftUsers.length) setSelectedIds(new Set());
                                else setSelectedIds(new Set(draftUsers.map(u => u.userId)));
                              }}
                            />
                          )}
                        </TableHead>
                      )}
                      <TableHead>User</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Persona</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDetails.map((u) => {
                      const status = getUserStatus(u);
                      const isDraft = status === "draft";
                      return (
                        <TableRow
                          key={u.userId}
                          className={`cursor-pointer ${selectedUserId === u.userId ? "bg-primary/5" : "hover:bg-muted/50"}`}
                          onClick={() => openUserPanel(u.userId)}
                        >
                          {isExecutor && (
                            <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                              {isDraft && (
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 accent-primary"
                                  checked={selectedIds.has(u.userId)}
                                  onChange={() => toggleSelect(u.userId)}
                                />
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-sm font-medium">
                            <span className="flex items-center gap-1">
                              {u.userName}
                              {u.hasPersonaCascadeFlag && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1 bg-amber-50 text-amber-700 border-amber-200" title="Persona mapping changed but individual override preserved">
                                  override kept
                                </Badge>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{u.department ?? "\u2014"}</TableCell>
                          <TableCell className="text-sm">{u.personaName ?? "\u2014"}</TableCell>
                          <TableCell className="text-sm">{u.allAssignments.length}</TableCell>
                          <TableCell><StatusBadgeInline status={status} isRemap={isRemappedUser(u)} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isExecutor && isDraft && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                  onClick={(e) => { e.stopPropagation(); submitUserForReview(u.userId); }}
                                  disabled={submittingSingle}
                                >
                                  <Send className="h-3 w-3 mr-1" /> Submit
                                </Button>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Edit panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedUser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{selectedUser.userName}</span>
                    <StatusBadgeInline status={selectedUserStatus} />
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedUserId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : "Select a user"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser ? (
              <div className="space-y-4">
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Persona:</span> {selectedUser.personaName ?? "None"}</p>
                  <p><span className="text-muted-foreground">Department:</span> {selectedUser.department ?? "\u2014"}</p>
                </div>

                {!isEditable && (
                  <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground space-y-2">
                    <p>Assignments are locked ({selectedUserStatus === "pending_review" ? "pending SOD review" : selectedUserStatus.replace("_", " ")}).</p>
                    {(selectedUserStatus === "sod_rejected" || selectedUserStatus === "remap_required") && (
                      <a
                        href={`/sod?search=${encodeURIComponent(selectedUser!.userName)}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:underline"
                      >
                        View SOD Conflicts &rarr;
                      </a>
                    )}
                    {isExecutor && (selectedUserStatus === "pending_review" || selectedUserStatus === "sod_clean") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => sendBackToDraft(selectedUser!.userId)}
                        disabled={sendingBack}
                      >
                        {sendingBack
                          ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Sending back…</>
                          : <><Undo2 className="h-3 w-3 mr-1" />Send Back to Draft</>}
                      </Button>
                    )}
                  </div>
                )}

                {selectedUser.hasPersonaCascadeFlag && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                    <span className="font-medium">Persona mapping changed</span> — this user has individual overrides that were preserved when the persona-level mapping was updated. Review the overrides below to ensure they are still appropriate.
                  </div>
                )}

                {/* Existing Production Access (locked, from previous waves) */}
                {selectedUser.existingAccessRoles.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Existing Production Access (Wave 1)</h4>
                    <div className="space-y-1">
                      {selectedUser.existingAccessRoles.map(r => (
                        <div key={r.targetRoleId} className="flex items-center gap-2 text-xs rounded-md border bg-muted/30 px-2 py-1.5 opacity-70">
                          <Badge variant="secondary" className="text-xs">{r.roleName}</Badge>
                          <span className="text-muted-foreground font-mono">{r.roleId}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 ml-auto">locked</Badge>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Existing access from previous releases cannot be modified by mappers.</p>
                  </div>
                )}

                {/* Persona Default Roles */}
                {selectedUser.personaDefaultRoles.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Persona Default Roles</h4>
                    <div className="space-y-1">
                      {selectedUser.personaDefaultRoles.map(r => (
                        <div key={r.targetRoleId} className="flex items-center gap-2 text-xs">
                          <Badge variant="secondary" className="text-xs">{r.roleName}</Badge>
                          <span className="text-muted-foreground font-mono">{r.roleId}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 1: Currently Assigned Roles */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">
                    Assigned Roles ({editRoles.length})
                  </h4>
                  {editRoles.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">No roles assigned yet. Add roles from the list below.</p>
                  ) : (
                    <div className="space-y-1 max-h-[180px] overflow-y-auto">
                      {targetRoles.filter(r => editRoles.includes(r.id)).map(r => {
                        const isDefault = selectedUser.personaDefaultRoles.some(d => d.targetRoleId === r.id);
                        return (
                          <div
                            key={r.id}
                            className={`flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-xs ${isEditable ? "group" : "opacity-60"}`}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                              <div>
                                <span className="font-medium">{r.roleName}</span>
                                {r.domain && <span className="text-muted-foreground ml-1">· {r.domain}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {isDefault && <Badge variant="outline" className="text-[10px] h-4 px-1">default</Badge>}
                              {!isDefault && <Badge variant="default" className="text-[10px] h-4 px-1">override</Badge>}
                              {isEditable && (
                                <button
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity ml-1"
                                  onClick={() => toggleRole(r.id)}
                                  title="Remove role"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Section 2: Available Roles (filterable by function) */}
                {isEditable && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Available Roles</h4>
                    <div className="flex items-center gap-2 mb-1.5">
                      <select
                        value={roleDomainFilter}
                        onChange={(e) => setRoleDomainFilter(e.target.value)}
                        className="rounded-md border border-input bg-background px-2 py-1 text-xs h-7 flex-1"
                      >
                        <option value="all">All Functions</option>
                        {Array.from(new Set(targetRoles.map(r => r.domain).filter((d): d is string => d !== null))).sort().map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {targetRoles
                        .filter(r => !editRoles.includes(r.id))
                        .filter(r => roleDomainFilter === "all" || r.domain === roleDomainFilter)
                        .map(r => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => toggleRole(r.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-3.5 w-3.5 rounded border border-muted-foreground/30" />
                            <div>
                              <span>{r.roleName}</span>
                              {r.domain && <span className="text-muted-foreground ml-1 text-[10px]">{r.domain}</span>}
                            </div>
                          </div>
                          <Plus className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isEditable && isExecutor && (
                  <div className="space-y-2">
                    <Button onClick={saveRefinements} disabled={saving} className="w-full" size="sm">
                      {saving ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                      ) : (
                        <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => submitUserForReview(selectedUser.userId)}
                      disabled={submittingSingle}
                      className="w-full border-teal-300 text-teal-700 hover:bg-teal-50"
                      size="sm"
                    >
                      {submittingSingle ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" /> Submit for Review</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Click a user from the table to view and edit their role assignments.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// -----------------------------------------------
// GapAnalysisTab
// -----------------------------------------------

export interface GapAnalysisTabProps {
  gaps: GapRow[];
  gapsByPersona: Map<string, GapRow[]>;
  gapSummary?: GapAnalysisSummary;
}

export function GapAnalysisTab({
  gaps,
  gapsByPersona,
  gapSummary,
}: GapAnalysisTabProps) {
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);
  const [runningGapAnalysis, setRunningGapAnalysis] = useState(false);
  const router = useRouter();

  async function runGapAnalysis() {
    setRunningGapAnalysis(true);
    try {
      const res = await fetch("/api/mapping/gap-analysis", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Gap analysis failed");
      } else {
        toast.success(`Gap analysis complete: ${data.totalGaps} gaps found across ${data.personasWithGaps} personas`);
        router.refresh();
      }
    } catch {
      toast.error("Failed to run gap analysis");
    } finally {
      setRunningGapAnalysis(false);
    }
  }

  if (gaps.length === 0 && (!gapSummary || gapSummary.gapsByPersona.length === 0)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <p className="text-muted-foreground text-center max-w-md">
            No access gaps detected. All legacy permissions are covered by target role mappings, or gap analysis has not been run yet.
          </p>
          <p className="text-xs text-muted-foreground text-center max-w-md">
            Gap analysis compares each persona&apos;s current (source) access against their future (target) roles to identify where users may lose access to capabilities they use today.
          </p>
          <Button onClick={runGapAnalysis} disabled={runningGapAnalysis} variant="outline" className="mt-2">
            {runningGapAnalysis ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Running...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Run Gap Analysis</>}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Use gapSummary if available (computed), fallback to raw gaps
  const useComputedSummary = gapSummary && gapSummary.totalSourcePermissions > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={runGapAnalysis} disabled={runningGapAnalysis} variant="outline" size="sm">
          {runningGapAnalysis ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Running...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Re-run Gap Analysis</>}
        </Button>
      </div>
      {/* Summary Card */}
      {useComputedSummary && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-3xl font-bold">
                    {gapSummary.coveragePercent}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Access Continuity
                  </div>
                </div>
                <p className="text-sm">
                  <span className="font-medium">{gapSummary.coveredPermissions}</span> of{" "}
                  <span className="font-medium">{gapSummary.totalSourcePermissions}</span>{" "}
                  current permissions carry forward to the target state
                </p>
                {gapSummary.gapsByPersona.length > 0 && (
                  <p className="text-sm text-amber-700 mt-1">
                    {gapSummary.totalSourcePermissions - gapSummary.coveredPermissions} access gap{gapSummary.totalSourcePermissions - gapSummary.coveredPermissions !== 1 ? "s" : ""} across{" "}
                    {gapSummary.gapsByPersona.length} persona{gapSummary.gapsByPersona.length !== 1 ? "s" : ""} — review for additional role needs or change impact
                  </p>
                )}
              </div>
              <div className="w-32 h-32 relative">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={gapSummary.coveragePercent >= 90 ? "#22c55e" : gapSummary.coveragePercent >= 70 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={`${gapSummary.coveragePercent}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gaps by Persona -- from computed summary */}
      {useComputedSummary ? (
        gapSummary.gapsByPersona.map((pg) => (
          <Card key={pg.personaId}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setExpandedPersona(expandedPersona === pg.personaName ? null : pg.personaName)}
            >
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expandedPersona === pg.personaName ? (
                    <ChevronRight className="h-4 w-4 rotate-90 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform" />
                  )}
                  <span>{pg.personaName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={pg.uncoveredCount > 5 ? "destructive" : "outline"} className="text-xs">
                    {pg.uncoveredCount} access gap{pg.uncoveredCount !== 1 ? "s" : ""}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {pg.totalPermissions - pg.uncoveredCount}/{pg.totalPermissions} covered
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            {expandedPersona === pg.personaName && (
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  These legacy permissions are not covered by any mapped target role. Users in this persona may need additional access, or this represents a change in their day-to-day workflow.
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Capability</TableHead>
                      <TableHead>Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pg.uncoveredPermissions.map((p) => (
                      <TableRow key={p.permissionId}>
                        <TableCell className="font-mono text-xs">{p.permissionId}</TableCell>
                        <TableCell className="text-sm">{p.permissionName ?? "\u2014"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.description ?? "Access removed in target state"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))
      ) : (
        /* Fallback: use raw gaps data */
        Array.from(gapsByPersona.entries()).map(([personaName, personaGaps]) => (
          <Card key={personaName}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setExpandedPersona(expandedPersona === personaName ? null : personaName)}
            >
              <CardTitle className="text-base flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expandedPersona === personaName ? (
                    <ChevronRight className="h-4 w-4 rotate-90 transition-transform" />
                  ) : (
                    <ChevronRight className="h-4 w-4 transition-transform" />
                  )}
                  <span>{personaName}</span>
                </div>
                <Badge variant={personaGaps.length > 5 ? "destructive" : "outline"} className="text-xs">
                  {personaGaps.length} access gap{personaGaps.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            {expandedPersona === personaName && (
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {personaGaps.map((g) => (
                    <Badge key={g.gapId} variant="outline" className="text-xs font-mono">
                      {g.permissionId}
                      {g.permissionName && (
                        <span className="ml-1 text-muted-foreground font-sans">({g.permissionName})</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
