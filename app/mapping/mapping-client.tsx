"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { AlertTriangle, CheckCircle, Circle, Loader2, Zap } from "lucide-react";
import type { PersonaMappingRow, UserRefinementRow, GapRow, TargetRoleRow, PersonaSodConflict } from "@/lib/queries";

interface PersonaDetailInfo {
  sourcePermissionCount: number;
  mappedRoles: { targetRoleId: number; roleName: string; roleId: string; coveragePercent: number | null; confidence: string | null }[];
}

interface MappingClientProps {
  personas: PersonaMappingRow[];
  personaDetails: Record<number, PersonaDetailInfo>;
  refinements: UserRefinementRow[];
  gaps: GapRow[];
  targetRoles: TargetRoleRow[];
  sodConflictsByPersona?: Record<number, PersonaSodConflict[]>;
}

export function MappingClient({ personas, personaDetails, refinements, gaps, targetRoles, sodConflictsByPersona = {} }: MappingClientProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(personas[0]?.personaId ?? null);
  const [autoMapping, setAutoMapping] = useState(false);
  const router = useRouter();

  const selectedDetail = selectedPersonaId ? personaDetails[selectedPersonaId] : null;
  const selectedPersona = personas.find(p => p.personaId === selectedPersonaId);

  async function autoMapAll() {
    setAutoMapping(true);
    try {
      const res = await fetch("/api/ai/target-role-mapping", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(`Auto-map failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setAutoMapping(false);
      router.refresh();
    }
  }

  // Group gaps by persona
  const gapsByPersona = new Map<string, GapRow[]>();
  for (const gap of gaps) {
    const existing = gapsByPersona.get(gap.personaName) || [];
    existing.push(gap);
    gapsByPersona.set(gap.personaName, existing);
  }

  return (
    <Tabs defaultValue="persona-mapping">
      <TabsList>
        <TabsTrigger value="persona-mapping">Persona Mapping</TabsTrigger>
        <TabsTrigger value="refinements">Individual Refinements ({refinements.length})</TabsTrigger>
        <TabsTrigger value="gap-analysis">Gap Analysis ({gaps.length})</TabsTrigger>
      </TabsList>

      {/* Tab A: Persona Mapping */}
      <TabsContent value="persona-mapping" className="mt-4">
        <div className="flex items-center gap-3 mb-4">
          <Button onClick={autoMapAll} disabled={autoMapping}>
            {autoMapping ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Auto-Mapping...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" /> Auto-Map All (Least Access)</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Persona list */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Personas ({personas.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                {personas.map((p) => {
                  const isSelected = selectedPersonaId === p.personaId;
                  const isMapped = p.mappedRoleCount > 0;
                  const hasSodConflicts = (sodConflictsByPersona[p.personaId]?.length ?? 0) > 0;
                  return (
                    <div
                      key={p.personaId}
                      className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-b text-sm ${
                        isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedPersonaId(p.personaId)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {hasSodConflicts ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        ) : isMapped ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.personaName}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.userCount} users
                            {hasSodConflicts && (
                              <span className="text-red-500 ml-1">
                                ({sodConflictsByPersona[p.personaId].length} SOD conflict{sodConflictsByPersona[p.personaId].length !== 1 ? "s" : ""})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {p.mappedRoleCount} roles
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Right: Mapping detail */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                {selectedPersona ? selectedPersona.personaName : "Select a persona"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPersona && selectedDetail ? (
                <div className="space-y-4">
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Group:</span>{" "}
                      <span className="font-medium">{selectedPersona.groupName ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Users:</span>{" "}
                      <span className="font-medium">{selectedPersona.userCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Source Permissions:</span>{" "}
                      <span className="font-medium">{selectedDetail.sourcePermissionCount}</span>
                    </div>
                  </div>

                  {/* SOD Conflict Warning Banner */}
                  {selectedPersonaId && sodConflictsByPersona[selectedPersonaId] && sodConflictsByPersona[selectedPersonaId].length > 0 && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-red-800">
                            SOD Conflicts Detected ({sodConflictsByPersona[selectedPersonaId].length})
                          </p>
                          <p className="text-red-700 mt-1">
                            Users in this persona have segregation of duties conflicts. Consider removing one of the conflicting roles below to resolve.
                          </p>
                          <div className="mt-2 space-y-1">
                            {sodConflictsByPersona[selectedPersonaId].map((sc) => (
                              <div key={sc.conflictId} className="flex items-center gap-2 text-xs text-red-700 bg-red-100 rounded px-2 py-1">
                                <Badge variant="secondary" className="text-[10px] bg-red-200 text-red-800">
                                  {sc.severity}
                                </Badge>
                                <span className="font-medium">{sc.userName}:</span>
                                <span>
                                  {sc.roleNameA ?? "?"} <span className="text-red-400">vs</span> {sc.roleNameB ?? "?"}
                                </span>
                                <span className="text-red-500">({sc.ruleName})</span>
                              </div>
                            ))}
                          </div>
                          <a href="/sod" className="inline-block mt-2 text-xs font-medium text-red-700 underline hover:text-red-900">
                            Go to SOD Conflicts page to fix &rarr;
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium mb-2">Mapped Target Roles ({selectedDetail.mappedRoles.length})</h4>
                    {selectedDetail.mappedRoles.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Role ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Coverage</TableHead>
                            <TableHead>Confidence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedDetail.mappedRoles.map((r) => (
                            <TableRow key={r.targetRoleId}>
                              <TableCell className="font-mono text-xs">{r.roleId}</TableCell>
                              <TableCell className="text-sm">{r.roleName}</TableCell>
                              <TableCell className="text-sm">
                                {r.coveragePercent != null ? `${Math.round(r.coveragePercent)}%` : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{r.confidence ?? "—"}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        No target roles mapped. Use &quot;Auto-Map All&quot; or run target role mapping from the Jobs page.
                      </p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Available Target Roles</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {targetRoles.map((r) => {
                        const isMapped = selectedDetail.mappedRoles.some(m => m.targetRoleId === r.id);
                        return (
                          <Badge
                            key={r.id}
                            variant={isMapped ? "default" : "outline"}
                            className="text-xs"
                          >
                            {r.roleName}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select a persona from the list to view its mapping details.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* Tab B: Individual Refinements */}
      <TabsContent value="refinements" className="mt-4">
        {refinements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <p className="text-muted-foreground text-center">
                No individual refinements. All users are using their persona default role assignments.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Persona</TableHead>
                    <TableHead>Target Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refinements.map((r) => (
                    <TableRow key={r.assignmentId}>
                      <TableCell className="text-sm font-medium">{r.userName}</TableCell>
                      <TableCell className="text-sm">{r.department ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.personaName ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.targetRoleName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{r.assignmentType}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Tab C: Gap Analysis */}
      <TabsContent value="gap-analysis" className="mt-4">
        {gaps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <p className="text-muted-foreground text-center">
                No permission gaps detected. All source permissions have target role coverage, or no gap analysis has been run yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Array.from(gapsByPersona.entries()).map(([personaName, personaGaps]) => (
              <Card key={personaName}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {personaName} — {personaGaps.length} uncovered permissions
                  </CardTitle>
                </CardHeader>
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
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
