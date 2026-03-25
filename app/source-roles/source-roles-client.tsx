"use client";

import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { SourceRoleRow } from "@/lib/queries";

interface PermissionInfo {
  id: number;
  permissionId: string;
  permissionName: string | null;
  permissionType: string | null;
  riskLevel: string | null;
}

const SYSTEM_COLORS: Record<string, string> = {
  "SAP ECC": "bg-blue-100 text-blue-800 border-blue-200",
  "S/4HANA": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "JDE": "bg-purple-100 text-purple-800 border-purple-200",
  "Oracle": "bg-orange-100 text-orange-800 border-orange-200",
  "Legacy HR": "bg-pink-100 text-pink-800 border-pink-200",
  "Active Directory": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Unknown": "bg-gray-100 text-gray-700 border-gray-200",
};

function getSystemColor(system: string | null): string {
  return SYSTEM_COLORS[system ?? "Unknown"] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

export function SourceRolesClient({
  roles,
  rolePermissions,
  systems,
}: {
  roles: SourceRoleRow[];
  rolePermissions: Record<number, PermissionInfo[]>;
  systems: string[];
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedSystem, setSelectedSystem] = useState("__all__");

  function toggleRow(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredRoles = useMemo(() => {
    if (selectedSystem === "__all__") return roles;
    return roles.filter((r) => (r.system ?? "Unknown") === selectedSystem);
  }, [roles, selectedSystem]);

  // Group roles by system for display
  const groupedRoles = useMemo(() => {
    const groups = new Map<string, SourceRoleRow[]>();
    for (const role of filteredRoles) {
      const sys = role.system ?? "Unknown";
      const existing = groups.get(sys) ?? [];
      existing.push(role);
      groups.set(sys, existing);
    }
    return groups;
  }, [filteredRoles]);

  const systemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const role of roles) {
      const sys = role.system ?? "Unknown";
      counts[sys] = (counts[sys] ?? 0) + 1;
    }
    return counts;
  }, [roles]);

  return (
    <div className="space-y-4">
      {/* System filter */}
      <div className="flex items-center gap-3">
        <Select value={selectedSystem} onValueChange={setSelectedSystem}>
          <SelectTrigger className="w-[220px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Systems ({roles.length})</SelectItem>
            {systems.map((sys) => (
              <SelectItem key={sys} value={sys}>
                {sys} ({systemCounts[sys] ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          {systems.map((sys) => (
            <Badge
              key={sys}
              variant="outline"
              className={`text-[10px] cursor-pointer ${
                selectedSystem === sys ? getSystemColor(sys) : "opacity-50"
              }`}
              onClick={() => setSelectedSystem(selectedSystem === sys ? "__all__" : sys)}
            >
              {sys}: {systemCounts[sys] ?? 0}
            </Badge>
          ))}
        </div>
      </div>

      {/* Roles table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Role ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>System</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Permissions</TableHead>
              <TableHead className="text-right">Users</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No source roles found.
                </TableCell>
              </TableRow>
            ) : (
              Array.from(groupedRoles.entries()).map(([system, sysRoles]) => (
                <React.Fragment key={system}>
                  {/* System group header when showing all systems */}
                  {selectedSystem === "__all__" && systems.length > 1 && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={8} className="py-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${getSystemColor(system)}`}>
                            {system}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {sysRoles.length} role{sysRoles.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {sysRoles.map((role) => (
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
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${getSystemColor(role.system)}`}>
                            {role.system ?? "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{role.domain ?? "\u2014"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{role.roleOwner ?? "\u2014"}</TableCell>
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
                  ))}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
