"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { BulkDeleteBar } from "@/components/shared/bulk-delete-bar";
import type { TargetRoleRow, TargetPermissionInfo } from "@/lib/queries";

export function TargetRolesClient({
  roles,
  rolePermissions,
  isAdmin = false,
}: {
  roles: TargetRoleRow[];
  rolePermissions: Record<number, TargetPermissionInfo[]>;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

  const allSelected = roles.length > 0 && roles.every((r) => selectedIds.has(r.id));

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
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 10 : 9} className="h-24 text-center text-muted-foreground">
                  No target roles found.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <React.Fragment key={role.id}>
                  <TableRow className="cursor-pointer">
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
                    <TableCell onClick={() => toggleRow(role.id)} className="font-medium text-sm">{role.roleName}</TableCell>
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
    </>
  );
}
