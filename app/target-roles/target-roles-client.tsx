"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BulkDeleteBar } from "@/components/shared/bulk-delete-bar";
import type { TargetRoleRow, TargetPermissionInfo } from "@/lib/queries";

interface SodViolationInfo {
  violationCount: number;
  affectedUserCount: number;
  worstSeverity: string;
}

export function TargetRolesClient({
  roles,
  rolePermissions,
  isAdmin = false,
  sodViolationMap = {},
}: {
  roles: TargetRoleRow[];
  rolePermissions: Record<number, TargetPermissionInfo[]>;
  isAdmin?: boolean;
  sodViolationMap?: Record<number, SodViolationInfo>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workItemId = searchParams.get("workItemId");
  const highlightRoleId = searchParams.get("roleId") ? parseInt(searchParams.get("roleId")!, 10) : null;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showOnlyViolations, setShowOnlyViolations] = useState(false);
  const [completeNotes, setCompleteNotes] = useState("");
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [submittingComplete, setSubmittingComplete] = useState(false);

  // Auto-expand the highlighted role when opened from a work item
  useEffect(() => {
    if (highlightRoleId) {
      setExpanded((prev) => new Set(prev).add(highlightRoleId));
    }
  }, [highlightRoleId]);

  async function handleCompleteRedesign() {
    if (!workItemId || !completeNotes.trim()) return;
    setSubmittingComplete(true);
    try {
      const res = await fetch(`/api/sod-triage/work-items/${workItemId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityNotes: completeNotes.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success(`Redesign complete — ${data.affectedAssignmentCount} assignment(s) returned to remapping queue`);
      setShowCompleteDialog(false);
      setCompleteNotes("");
      router.push("/workspace/security");
    } catch {
      toast.error("Failed to complete redesign");
    } finally {
      setSubmittingComplete(false);
    }
  }

  function toggleRow(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasViolations = Object.keys(sodViolationMap).length > 0;
  const displayedRoles = showOnlyViolations ? roles.filter(r => sodViolationMap[r.id]) : roles;
  const allSelected = displayedRoles.length > 0 && displayedRoles.every((r) => selectedIds.has(r.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(roles.map((r) => r.id)));
    }
  }

  async function handleBulkDelete() {
    const res = await fetch("/api/admin/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityType: "targetRoles", ids: Array.from(selectedIds) }),
    });
    if (res.ok) {
      setSelectedIds(new Set());
      router.refresh();
    } else {
      alert("Delete failed");
    }
  }

  return (
    <>
      {hasViolations && (
        <div className="flex items-center gap-2 mb-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyViolations}
              onChange={(e) => setShowOnlyViolations(e.target.checked)}
              className="h-4 w-4 accent-amber-600"
            />
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            Show only roles with SOD violations
          </label>
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </TableHead>
              )}
              <TableHead className="w-8"></TableHead>
              <TableHead>Role ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Permissions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 10 : 9} className="h-24 text-center text-muted-foreground">
                  {showOnlyViolations ? "No roles with SOD violations." : "No target roles found."}
                </TableCell>
              </TableRow>
            ) : (
              displayedRoles.map((role) => (
                <React.Fragment key={role.id}>
                  <TableRow className={`cursor-pointer ${highlightRoleId === role.id ? "bg-amber-50" : ""}`}>
                    {isAdmin && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(role.id)}
                          onChange={() => toggleSelect(role.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                        />
                      </TableCell>
                    )}
                    <TableCell onClick={() => toggleRow(role.id)}>
                      {expanded.has(role.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(role.id)} className="font-mono text-xs">{role.roleId}</TableCell>
                    <TableCell onClick={() => toggleRow(role.id)} className="font-medium text-sm">
                      <span className="flex items-center gap-2">
                        {role.roleName}
                        {sodViolationMap[role.id] && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200" title={`${sodViolationMap[role.id].violationCount} violation(s) · ${sodViolationMap[role.id].affectedUserCount} affected user(s)`}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Structural SOD
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell onClick={() => toggleRow(role.id)} className="text-sm">{role.domain ?? "\u2014"}</TableCell>
                    <TableCell onClick={() => toggleRow(role.id)} className="text-sm">{role.system ?? "\u2014"}</TableCell>
                    <TableCell onClick={() => toggleRow(role.id)} className="text-sm text-muted-foreground">{role.roleOwner ?? "\u2014"}</TableCell>
                    <TableCell onClick={() => toggleRow(role.id)} className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {role.description ?? "\u2014"}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(role.id)} className="text-right text-sm">
                      {role.permissionCount > 0 ? (
                        <Badge variant="outline" className="text-xs">{role.permissionCount}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded.has(role.id) && (
                    <TableRow>
                      <TableCell colSpan={isAdmin ? 10 : 9} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Permissions ({rolePermissions[role.id]?.length ?? 0})
                          </p>
                          {(rolePermissions[role.id]?.length ?? 0) > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {rolePermissions[role.id].map((p) => (
                                <Badge
                                  key={p.id}
                                  variant="outline"
                                  className="text-xs font-mono"
                                  title={p.permissionName ?? undefined}
                                >
                                  {p.permissionId}
                                  {p.permissionType && (
                                    <span className="ml-1 text-muted-foreground">
                                      [{p.permissionType}]
                                    </span>
                                  )}
                                  {p.riskLevel && (
                                    <span className={`ml-1 ${
                                      p.riskLevel === "high" ? "text-red-600" :
                                      p.riskLevel === "medium" ? "text-yellow-600" :
                                      "text-green-600"
                                    }`}>
                                      ({p.riskLevel})
                                    </span>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No permissions</p>
                          )}
                          {workItemId && highlightRoleId === role.id && (
                            <div className="mt-3 pt-3 border-t">
                              <Button size="sm" onClick={() => setShowCompleteDialog(true)}>
                                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                Complete Redesign
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {isAdmin && (
        <BulkDeleteBar
          selectedCount={selectedIds.size}
          entityLabel="target roles"
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {showCompleteDialog && workItemId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold">Complete Redesign</h3>
            <p className="text-sm text-muted-foreground">
              This will mark the role redesign as complete and return all affected
              assignments to the re-mapping queue for mapper review.
            </p>
            <div>
              <label className="text-sm font-medium block mb-1">
                Security Notes (what was changed)
              </label>
              <textarea
                className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px]"
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Describe the changes made to the role definition..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowCompleteDialog(false); setCompleteNotes(""); }}
                disabled={submittingComplete}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCompleteRedesign}
                disabled={submittingComplete || !completeNotes.trim()}
              >
                {submittingComplete ? "Saving..." : "Complete Redesign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
