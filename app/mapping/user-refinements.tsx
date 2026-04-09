"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, ChevronRight, Loader2, Search, X, Save, Send, Plus, Undo2, RefreshCw } from "lucide-react";
import type { TargetRoleRow, UserRefinementDetail, UserGapSummaryRow } from "@/lib/queries";

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
  preSelectedUserId?: number | null;
  onUserSelected?: () => void;
  /** When set, pre-filter to only show users with at least one assignment in this status */
  fixedStatusFilter?: string;
}

export function RefinementsTab({
  refinementDetails,
  targetRoles,
  totalUsersWithAssignments,
  userRole,
  preSelectedUserId,
  onUserSelected,
  fixedStatusFilter,
}: RefinementsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(preSelectedUserId ?? null);

  // Handle remap navigation from gap analysis tab
  useEffect(() => {
    if (preSelectedUserId != null) {
      setSelectedUserId(preSelectedUserId);
      onUserSelected?.();
    }
  }, [preSelectedUserId, onUserSelected]);

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

  // When fixedStatusFilter is set (e.g. "remap_required"), pre-filter to only those users
  const baseDetails = fixedStatusFilter
    ? localDetails.filter(u => u.allAssignments.some(a => a.status === fixedStatusFilter))
    : localDetails;

  const isExecutor = userRole && ["system_admin", "admin", "mapper"].includes(userRole);
  const selectedUser = baseDetails.find(u => u.userId === selectedUserId);

  // Unique departments for filter
  const departments = Array.from(new Set(baseDetails.map(u => u.department).filter((d): d is string => d !== null))).sort();

  // Status counts
  const statusCounts = baseDetails.reduce((acc, u) => {
    const s = getUserStatus(u);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter users
  const filteredDetails = baseDetails.filter(u => {
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

// ─────────────────────────────────────────────
// GAP ANALYSIS TAB — User-Level Access Change Workbench
// ─────────────────────────────────────────────

const IMPACT_CONFIG = {
  high: { label: "High Impact", color: "bg-red-100 text-red-800 border-red-200", dot: "bg-red-500", description: "Significant workflow changes likely" },
  medium: { label: "Medium Impact", color: "bg-amber-100 text-amber-800 border-amber-200", dot: "bg-amber-500", description: "Moderate access changes" },
  low: { label: "Low Impact", color: "bg-blue-100 text-blue-800 border-blue-200", dot: "bg-blue-500", description: "Minor access adjustments" },
  none: { label: "No Change", color: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400", description: "Full access continuity" },
} as const;

export interface GapAnalysisTabProps {
  userGapData: UserGapSummaryRow[];
  unassignedPersonas?: { personaId: number; personaName: string; sourcePermissionCount: number }[];
  onRemapUser?: (userId: number) => void;
  userRole?: string;
}

export function GapAnalysisTab({
  userGapData,
  unassignedPersonas = [],
  onRemapUser,
  userRole,
}: GapAnalysisTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [impactFilter, setImpactFilter] = useState<"all" | "high" | "medium" | "low" | "none">("all");
  // statusFilter reserved for future use (filter between pending/confirmed in main table)
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const router = useRouter();

  const canEdit = userRole && ["system_admin", "admin", "mapper"].includes(userRole);

  async function runGapAnalysis() {
    setRunningAnalysis(true);
    try {
      const res = await fetch("/api/mapping/gap-analysis", { method: "POST" });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Gap analysis failed");
      else {
        toast.success(`Analysis complete: ${data.totalGaps} access gaps found`);
        router.refresh();
      }
    } catch { toast.error("Failed to run gap analysis"); }
    finally { setRunningAnalysis(false); }
  }

  async function confirmUser(userId: number) {
    setConfirming(userId);
    try {
      const res = await fetch("/api/mapping/gap-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "confirm" }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Failed"); }
      else { toast.success("User confirmed as-is"); router.refresh(); }
    } catch { toast.error("Failed to confirm"); }
    finally { setConfirming(null); }
  }

  async function undoConfirm(userId: number) {
    setConfirming(userId);
    try {
      const res = await fetch("/api/mapping/gap-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "undo" }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Failed"); }
      else { toast.success("Confirmation undone"); router.refresh(); }
    } catch { toast.error("Failed to undo"); }
    finally { setConfirming(null); }
  }

  async function bulkConfirm() {
    if (bulkSelected.size === 0) return;
    setBulkConfirming(true);
    try {
      const res = await fetch("/api/mapping/gap-review/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(bulkSelected) }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || "Failed"); }
      else {
        const d = await res.json();
        toast.success(`${d.confirmed} user${d.confirmed !== 1 ? "s" : ""} confirmed`);
        setBulkSelected(new Set());
        router.refresh();
      }
    } catch { toast.error("Bulk confirm failed"); }
    finally { setBulkConfirming(false); }
  }

  // Separate pending vs confirmed
  const pending = userGapData.filter(u => u.reviewStatus === "pending");
  const confirmed = userGapData.filter(u => u.reviewStatus === "confirmed_as_is");

  // Filter pending users
  const filtered = pending.filter(u => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!u.displayName.toLowerCase().includes(q) && !(u.department ?? "").toLowerCase().includes(q) && !(u.personaName ?? "").toLowerCase().includes(q)) return false;
    }
    if (impactFilter !== "all" && u.changeImpactLevel !== impactFilter) return false;
    return true;
  });

  // Summary counts
  const highCount = userGapData.filter(u => u.changeImpactLevel === "high").length;
  const medCount = userGapData.filter(u => u.changeImpactLevel === "medium").length;
  const lowCount = userGapData.filter(u => u.changeImpactLevel === "low").length;
  const noneCount = userGapData.filter(u => u.changeImpactLevel === "none").length;

  // Group confirmed by impact
  const confirmedByImpact = {
    high: confirmed.filter(u => u.changeImpactLevel === "high"),
    medium: confirmed.filter(u => u.changeImpactLevel === "medium"),
    low: confirmed.filter(u => u.changeImpactLevel === "low"),
    none: confirmed.filter(u => u.changeImpactLevel === "none"),
  };

  if (userGapData.length === 0 && unassignedPersonas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <p className="text-muted-foreground text-center max-w-md">
            No users with access data to analyze. Run target role mapping first, then come back to review access changes.
          </p>
          <Button onClick={runGapAnalysis} disabled={runningAnalysis} variant="outline" className="mt-2">
            {runningAnalysis ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Running...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Run Gap Analysis</>}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Review how each user&apos;s access changes under the least access principle. Confirm reductions are intentional or remap users who need different roles.
          </p>
        </div>
        <Button onClick={runGapAnalysis} disabled={runningAnalysis} variant="outline" size="sm">
          {runningAnalysis ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Running...</> : <><RefreshCw className="h-4 w-4 mr-2" /> Re-analyze</>}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setImpactFilter(impactFilter === "high" ? "all" : "high")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="text-xs font-medium text-muted-foreground">High Impact</span>
            </div>
            <div className="text-2xl font-bold">{highCount}</div>
            <p className="text-[11px] text-muted-foreground">&gt;30% access loss</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setImpactFilter(impactFilter === "medium" ? "all" : "medium")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Medium Impact</span>
            </div>
            <div className="text-2xl font-bold">{medCount}</div>
            <p className="text-[11px] text-muted-foreground">10-30% access loss</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setImpactFilter(impactFilter === "low" ? "all" : "low")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Low Impact</span>
            </div>
            <div className="text-2xl font-bold">{lowCount}</div>
            <p className="text-[11px] text-muted-foreground">&lt;10% access loss</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setImpactFilter(impactFilter === "none" ? "all" : "none")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              <span className="text-xs font-medium text-muted-foreground">No Change</span>
            </div>
            <div className="text-2xl font-bold">{noneCount}</div>
            <p className="text-[11px] text-muted-foreground">Full continuity</p>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Personas Warning */}
      {unassignedPersonas.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {unassignedPersonas.length} persona{unassignedPersonas.length !== 1 ? "s" : ""} with permission patterns but no assigned users
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {unassignedPersonas.map(p => (
                <Badge key={p.personaId} variant="outline" className="text-xs border-amber-300 text-amber-700">
                  {p.personaName} ({p.sourcePermissionCount} perms)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Users Table */}
      {pending.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Pending Review ({pending.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {canEdit && bulkSelected.size > 0 && (
                  <Button size="sm" variant="outline" onClick={bulkConfirm} disabled={bulkConfirming}>
                    {bulkConfirming ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                    Confirm {bulkSelected.size} as-is
                  </Button>
                )}
              </div>
            </div>
            {/* Filters */}
            <div className="flex items-center gap-2 mt-2">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-8 text-xs pl-8" />
              </div>
              <div className="flex gap-1">
                {(["all", "high", "medium", "low", "none"] as const).map(level => (
                  <Button
                    key={level}
                    variant={impactFilter === level ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-[11px] px-2"
                    onClick={() => setImpactFilter(level)}
                  >
                    {level === "all" ? "All" : IMPACT_CONFIG[level].label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {canEdit && <TableHead className="w-8"><input type="checkbox" className="h-3.5 w-3.5" checked={filtered.length > 0 && filtered.every(u => bulkSelected.has(u.userId))} onChange={() => { if (filtered.every(u => bulkSelected.has(u.userId))) setBulkSelected(new Set()); else setBulkSelected(new Set(filtered.map(u => u.userId))); }} /></TableHead>}
                  <TableHead>User</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Access Change</TableHead>
                  <TableHead>Impact</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={canEdit ? 6 : 4} className="text-center text-muted-foreground py-8">No users match the current filter</TableCell></TableRow>
                )}
                {filtered.map(u => {
                  const impact = IMPACT_CONFIG[u.changeImpactLevel];
                  const isExpanded = expandedUserId === u.userId;
                  return (
                    <>
                      <TableRow key={u.userId} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedUserId(isExpanded ? null : u.userId)}>
                        {canEdit && (
                          <TableCell onClick={e => e.stopPropagation()}>
                            <input type="checkbox" className="h-3.5 w-3.5" checked={bulkSelected.has(u.userId)} onChange={() => setBulkSelected(prev => { const n = new Set(prev); if (n.has(u.userId)) n.delete(u.userId); else n.add(u.userId); return n; })} />
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{u.displayName}</p>
                            {u.department && <p className="text-xs text-muted-foreground">{u.department}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{u.personaName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{u.sourceRoleCount} → {u.targetRoleCount} roles</span>
                            <div className="flex gap-1">
                              {u.uncoveredCount > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-red-200 text-red-700">-{u.uncoveredCount}</Badge>}
                              {u.newPermCount > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-200 text-green-700">+{u.newPermCount}</Badge>}
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{u.coveragePercent}% access continuity</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${impact.color}`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${impact.dot} mr-1`} />
                            {impact.label}
                          </Badge>
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {onRemapUser && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRemapUser(u.userId)}>
                                  Remap
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => confirmUser(u.userId)} disabled={confirming === u.userId}>
                                {confirming === u.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${u.userId}-detail`}>
                          <TableCell colSpan={canEdit ? 6 : 4} className="bg-slate-50 px-8 py-4">
                            <div className="grid grid-cols-2 gap-6 text-sm">
                              <div>
                                <p className="font-medium mb-1 text-xs uppercase tracking-wide text-muted-foreground">Source Access ({u.sourceRoleCount} roles, {u.sourcePermCount} permissions)</p>
                                <p className="text-muted-foreground text-xs">This user had {u.sourceRoleCount} source role{u.sourceRoleCount !== 1 ? "s" : ""} providing {u.sourcePermCount} unique permission{u.sourcePermCount !== 1 ? "s" : ""} in the legacy system.</p>
                              </div>
                              <div>
                                <p className="font-medium mb-1 text-xs uppercase tracking-wide text-muted-foreground">Target Access ({u.targetRoleCount} roles, {u.targetPermCount} permissions)</p>
                                <p className="text-muted-foreground text-xs">Under least access, mapped to {u.targetRoleCount} target role{u.targetRoleCount !== 1 ? "s" : ""} with {u.targetPermCount} permission{u.targetPermCount !== 1 ? "s" : ""}.</p>
                              </div>
                            </div>
                            {u.uncoveredCount > 0 && (
                              <div className="mt-3 p-3 rounded border border-red-100 bg-red-50">
                                <p className="text-xs font-medium text-red-800">{u.uncoveredCount} permission{u.uncoveredCount !== 1 ? "s" : ""} will be removed — {u.changeImpactLevel === "high" ? "significant workflow impact likely" : u.changeImpactLevel === "medium" ? "moderate impact on daily tasks" : "minor impact expected"}</p>
                              </div>
                            )}
                            {u.newPermCount > 0 && (
                              <div className="mt-2 p-3 rounded border border-green-100 bg-green-50">
                                <p className="text-xs font-medium text-green-800">{u.newPermCount} new permission{u.newPermCount !== 1 ? "s" : ""} will be granted in the target state</p>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Confirmed Users Section */}
      {confirmed.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Confirmed As-Is ({confirmed.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              These users&apos; access reductions have been reviewed and confirmed. Grouped by anticipated change impact for OCM planning.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["high", "medium", "low", "none"] as const).map(level => {
              const users = confirmedByImpact[level];
              if (users.length === 0) return null;
              const impact = IMPACT_CONFIG[level];
              const avgCoverage = Math.round(users.reduce((s, u) => s + u.coveragePercent, 0) / users.length);
              return (
                <div key={level} className="border rounded-md">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${impact.dot}`} />
                      <span className="text-sm font-medium">{impact.label}</span>
                      <span className="text-xs text-muted-foreground">· {users.length} user{users.length !== 1 ? "s" : ""} · avg {avgCoverage}% continuity</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{impact.description}</span>
                  </div>
                  <div className="divide-y">
                    {users.map(u => (
                      <div key={u.userId} className="flex items-center justify-between px-4 py-2 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{u.displayName}</span>
                          <span className="text-xs text-muted-foreground">{u.department}</span>
                          <span className="text-xs text-muted-foreground">{u.sourceRoleCount} → {u.targetRoleCount} roles</span>
                          {u.uncoveredCount > 0 && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-red-200 text-red-700">-{u.uncoveredCount} perms</Badge>}
                        </div>
                        {canEdit && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={() => undoConfirm(u.userId)} disabled={confirming === u.userId}>
                            {confirming === u.userId ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Undo2 className="h-3 w-3 mr-1" /> Undo</>}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
