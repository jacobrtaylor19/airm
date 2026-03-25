"use client";

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SourceRoleRow } from "@/lib/queries";

interface PermissionInfo {
  id: number;
  permissionId: string;
  permissionName: string | null;
  permissionType: string | null;
  riskLevel: string | null;
}

export function SourceRolesClient({
  roles,
  rolePermissions,
}: {
  roles: SourceRoleRow[];
  rolePermissions: Record<number, PermissionInfo[]>;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggleRow(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Role ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>System</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="text-right">Permissions</TableHead>
            <TableHead className="text-right">Users</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No source roles found.
              </TableCell>
            </TableRow>
          ) : (
            roles.map((role) => (
              <React.Fragment key={role.id}>
                <TableRow
                  className="cursor-pointer"
                  onClick={() => toggleRow(role.id)}
                >
                  <TableCell>
                    {expanded.has(role.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{role.roleId}</TableCell>
                  <TableCell className="font-medium text-sm">{role.roleName}</TableCell>
                  <TableCell className="text-sm">{role.domain ?? "—"}</TableCell>
                  <TableCell className="text-sm">{role.system ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{role.roleOwner ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">{role.permissionCount}</TableCell>
                  <TableCell className="text-right text-sm">{role.userCount}</TableCell>
                </TableRow>
                {expanded.has(role.id) && (
                  <TableRow>
                    <TableCell colSpan={8} className="bg-muted/30 p-0">
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
  );
}
