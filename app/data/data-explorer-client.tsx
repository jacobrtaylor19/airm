"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  UserRoleAssignmentRow,
  SourcePermissionRow,
  TargetPermissionRow,
} from "@/lib/queries";

interface Props {
  userRoleAssignments: UserRoleAssignmentRow[];
  sourcePermissions: SourcePermissionRow[];
  targetPermissions: TargetPermissionRow[];
}

export function DataExplorerClient({
  userRoleAssignments,
  sourcePermissions,
  targetPermissions,
}: Props) {
  const [uraSearch, setUraSearch] = useState("");
  const [spSearch, setSpSearch] = useState("");
  const [tpSearch, setTpSearch] = useState("");

  const filteredUra = userRoleAssignments.filter(
    (r) =>
      r.userName.toLowerCase().includes(uraSearch.toLowerCase()) ||
      r.roleName.toLowerCase().includes(uraSearch.toLowerCase()) ||
      (r.system ?? "").toLowerCase().includes(uraSearch.toLowerCase())
  );

  const filteredSp = sourcePermissions.filter(
    (p) =>
      p.permissionId.toLowerCase().includes(spSearch.toLowerCase()) ||
      (p.permissionName ?? "").toLowerCase().includes(spSearch.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(spSearch.toLowerCase()) ||
      (p.permissionType ?? "").toLowerCase().includes(spSearch.toLowerCase())
  );

  const filteredTp = targetPermissions.filter(
    (p) =>
      p.permissionId.toLowerCase().includes(tpSearch.toLowerCase()) ||
      (p.permissionName ?? "").toLowerCase().includes(tpSearch.toLowerCase()) ||
      (p.description ?? "").toLowerCase().includes(tpSearch.toLowerCase()) ||
      (p.permissionType ?? "").toLowerCase().includes(tpSearch.toLowerCase())
  );

  const riskColors: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-green-100 text-green-700",
  };

  return (
    <Tabs defaultValue="user-role-assignments">
      <TabsList>
        <TabsTrigger value="user-role-assignments">
          User-Role Assignments ({userRoleAssignments.length})
        </TabsTrigger>
        <TabsTrigger value="source-permissions">
          Source Permissions ({sourcePermissions.length})
        </TabsTrigger>
        <TabsTrigger value="target-permissions">
          Target Permissions ({targetPermissions.length})
        </TabsTrigger>
      </TabsList>

      {/* User-Role Assignments Tab */}
      <TabsContent value="user-role-assignments" className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                User Source Role Assignments
              </CardTitle>
              <Input
                placeholder="Search assignments..."
                value={uraSearch}
                onChange={(e) => setUraSearch(e.target.value)}
                className="h-8 w-64 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredUra.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {userRoleAssignments.length === 0
                  ? "No user-role assignments found. Upload user-source-role-assignments.csv from the Data Upload page."
                  : "No results match your search."}
              </p>
            ) : (
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Name</TableHead>
                      <TableHead>Role Name</TableHead>
                      <TableHead>System</TableHead>
                      <TableHead>Assigned Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUra.slice(0, 500).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.userName}</TableCell>
                        <TableCell className="text-sm">{r.roleName}</TableCell>
                        <TableCell className="text-sm">{r.system ?? "\u2014"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.assignedDate ?? "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredUra.length > 500 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Showing 500 of {filteredUra.length} results. Narrow your search to see more.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Source Permissions Tab */}
      <TabsContent value="source-permissions" className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Source Permissions (Legacy System)
              </CardTitle>
              <Input
                placeholder="Search permissions..."
                value={spSearch}
                onChange={(e) => setSpSearch(e.target.value)}
                className="h-8 w-64 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredSp.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {sourcePermissions.length === 0
                  ? "No source permissions found."
                  : "No results match your search."}
              </p>
            ) : (
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>System</TableHead>
                      <TableHead>Risk Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSp.slice(0, 500).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.permissionId}</TableCell>
                        <TableCell className="text-sm">{p.permissionName ?? "\u2014"}</TableCell>
                        <TableCell className="text-sm">{p.permissionType ?? "\u2014"}</TableCell>
                        <TableCell className="text-sm">{p.system ?? "\u2014"}</TableCell>
                        <TableCell>
                          {p.riskLevel ? (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${riskColors[p.riskLevel.toLowerCase()] ?? ""}`}
                            >
                              {p.riskLevel}
                            </Badge>
                          ) : (
                            "\u2014"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredSp.length > 500 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Showing 500 of {filteredSp.length} results.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Target Permissions Tab */}
      <TabsContent value="target-permissions" className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Target Permissions (Future System)
              </CardTitle>
              <Input
                placeholder="Search permissions..."
                value={tpSearch}
                onChange={(e) => setTpSearch(e.target.value)}
                className="h-8 w-64 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredTp.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {targetPermissions.length === 0
                  ? "No target permissions found."
                  : "No results match your search."}
              </p>
            ) : (
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>System</TableHead>
                      <TableHead>Risk Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTp.slice(0, 500).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.permissionId}</TableCell>
                        <TableCell className="text-sm">{p.permissionName ?? "\u2014"}</TableCell>
                        <TableCell className="text-sm">{p.permissionType ?? "\u2014"}</TableCell>
                        <TableCell className="text-sm">{p.system ?? "\u2014"}</TableCell>
                        <TableCell>
                          {p.riskLevel ? (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${riskColors[p.riskLevel.toLowerCase()] ?? ""}`}
                            >
                              {p.riskLevel}
                            </Badge>
                          ) : (
                            "\u2014"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredTp.length > 500 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Showing 500 of {filteredTp.length} results.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
