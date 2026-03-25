"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Circle, Loader2, Zap, Search, ChevronRight, X, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { PersonaMappingRow, UserRefinementRow, GapRow, TargetRoleRow, PersonaSodConflict, GapAnalysisSummary, UserRefinementDetail } from "@/lib/queries";

interface PersonaDetailInfo {
  sourcePermissionCount: number;
  mappedRoles: { targetRoleId: number; roleName: string; roleId: string; coveragePercent: number | null; confidence: string | null; roleOwner: string | null }[];
}

interface MappingClientProps {
  personas: PersonaMappingRow[];
  personaDetails: Record<number, PersonaDetailInfo>;
  refinements: UserRefinementRow[];
  gaps: GapRow[];
  targetRoles: TargetRoleRow[];
  sodConflictsByPersona?: Record<number, PersonaSodConflict[]>;
  personaSourceSystems?: Record<number, string[]>;
  gapSummary?: GapAnalysisSummary;
  refinementDetails?: UserRefinementDetail[];
}

export function MappingClient({ personas, personaDetails, refinements, gaps, targetRoles, sodConflictsByPersona = {}, personaSourceSystems = {}, gapSummary, refinementDetails = [] }: MappingClientProps) {
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

  // Count refinements vs defaults
  const refinementCount = refinementDetails.filter(r => r.individualOverrides.length > 0).length;
  const totalUsersWithAssignments = refinementDetails.length;

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
                          {personaSourceSystems[p.personaId] && personaSourceSystems[p.personaId].length > 0 && (
                            <div className="flex gap-1 mt-0.5">
                              {personaSourceSystems[p.personaId].map((sys) => (
                                <Badge key={sys} variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-normal">
                                  {sys}
                                </Badge>
                              ))}
                            </div>
                          )}
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
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Group:</span>{" "}
                      <span className="font-medium">{selectedPersona.groupName ?? "\u2014"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Users:</span>{" "}
                      <span className="font-medium">{selectedPersona.userCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Source Permissions:</span>{" "}
                      <span className="font-medium">{selectedDetail.sourcePermissionCount}</span>
                    </div>
                    {selectedPersonaId && personaSourceSystems[selectedPersonaId] && personaSourceSystems[selectedPersonaId].length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Source Systems:</span>{" "}
                        <span className="inline-flex gap-1 ml-1">
                          {personaSourceSystems[selectedPersonaId].map((sys) => (
                            <Badge key={sys} variant="outline" className="text-xs">
                              {sys}
                            </Badge>
                          ))}
                        </span>
                      </div>
                    )}
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
                            <TableHead>Owner</TableHead>
                            <TableHead>Coverage</TableHead>
                            <TableHead>Confidence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedDetail.mappedRoles.map((r) => (
                            <TableRow key={r.targetRoleId}>
                              <TableCell className="font-mono text-xs">{r.roleId}</TableCell>
                              <TableCell className="text-sm">{r.roleName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{r.roleOwner ?? "—"}</TableCell>
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
        <RefinementsTab
          refinementDetails={refinementDetails}
          targetRoles={targetRoles}
          refinementCount={refinementCount}
          totalUsersWithAssignments={totalUsersWithAssignments}
        />
      </TabsContent>

      {/* Tab C: Gap Analysis */}
      <TabsContent value="gap-analysis" className="mt-4">
        <GapAnalysisTab
          gaps={gaps}
          gapsByPersona={gapsByPersona}
          gapSummary={gapSummary}
        />
      </TabsContent>
    </Tabs>
  );
}

// ─────────────────────────────────────────────
// Individual Refinements Tab
// ─────────────────────────────────────────────

function RefinementsTab({
  refinementDetails,
  targetRoles,
  refinementCount,
  totalUsersWithAssignments,
}: {
  refinementDetails: UserRefinementDetail[];
  targetRoles: TargetRoleRow[];
  refinementCount: number;
  totalUsersWithAssignments: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editRoles, setEditRoles] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const selectedUser = refinementDetails.find(u => u.userId === selectedUserId);

  // Filter users
  const filteredDetails = refinementDetails.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.userName.toLowerCase().includes(q) ||
      (u.department ?? "").toLowerCase().includes(q) ||
      (u.personaName ?? "").toLowerCase().includes(q)
    );
  });

  function openUserPanel(userId: number) {
    const user = refinementDetails.find(u => u.userId === userId);
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
        toast.error(data.error || "Failed to save refinements");
      } else {
        toast.success("Refinements saved successfully");
        setSelectedUserId(null);
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSaving(false);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Users with Assignments</p>
            <p className="text-2xl font-bold mt-1">{totalUsersWithAssignments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Users with Individual Overrides</p>
            <p className="text-2xl font-bold mt-1">{refinementCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Using Persona Defaults Only</p>
            <p className="text-2xl font-bold mt-1">{totalUsersWithAssignments - refinementCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: User list */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Users with Target Role Assignments</CardTitle>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredDetails.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {refinementDetails.length === 0
                  ? "No users with target role assignments yet. Run auto-mapping from the Persona Mapping tab first."
                  : "No users match your search."}
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Persona</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Overrides</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDetails.map((u) => {
                      const hasOverrides = u.individualOverrides.length > 0;
                      return (
                        <TableRow
                          key={u.userId}
                          className={`cursor-pointer ${selectedUserId === u.userId ? "bg-primary/5" : "hover:bg-muted/50"}`}
                          onClick={() => openUserPanel(u.userId)}
                        >
                          <TableCell className="text-sm font-medium">{u.userName}</TableCell>
                          <TableCell className="text-sm">{u.department ?? "—"}</TableCell>
                          <TableCell className="text-sm">{u.personaName ?? "—"}</TableCell>
                          <TableCell className="text-sm">{u.allAssignments.length}</TableCell>
                          <TableCell>
                            {hasOverrides ? (
                              <Badge variant="default" className="text-xs">{u.individualOverrides.length} override{u.individualOverrides.length !== 1 ? "s" : ""}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                  <span>{selectedUser.userName}</span>
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
                  <p><span className="text-muted-foreground">Department:</span> {selectedUser.department ?? "—"}</p>
                </div>

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

                {/* Editable Role Assignments (Current Wave) */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-1.5">Assigned Target Roles</h4>
                  <div className="space-y-1">
                    {targetRoles.map(r => {
                      const isAssigned = editRoles.includes(r.id);
                      const isDefault = selectedUser.personaDefaultRoles.some(d => d.targetRoleId === r.id);
                      return (
                        <div
                          key={r.id}
                          className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                            isAssigned ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleRole(r.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${
                              isAssigned ? "bg-primary border-primary text-white" : "border-muted-foreground/30"
                            }`}>
                              {isAssigned && <CheckCircle className="h-2.5 w-2.5" />}
                            </div>
                            <span className={isAssigned ? "font-medium" : ""}>{r.roleName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isDefault && <Badge variant="outline" className="text-[10px] h-4 px-1">default</Badge>}
                            {isAssigned && !isDefault && <Badge variant="default" className="text-[10px] h-4 px-1">override</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button onClick={saveRefinements} disabled={saving} className="w-full" size="sm">
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" /> Save Changes</>
                  )}
                </Button>
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

// ─────────────────────────────────────────────
// Gap Analysis Tab
// ─────────────────────────────────────────────

function GapAnalysisTab({
  gaps,
  gapsByPersona,
  gapSummary,
}: {
  gaps: GapRow[];
  gapsByPersona: Map<string, GapRow[]>;
  gapSummary?: GapAnalysisSummary;
}) {
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);

  if (gaps.length === 0 && (!gapSummary || gapSummary.gapsByPersona.length === 0)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12">
          <CheckCircle className="h-8 w-8 text-green-500" />
          <p className="text-muted-foreground text-center">
            No permission gaps detected. All source permissions have target role coverage, or no gap analysis has been run yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Use gapSummary if available (computed), fallback to raw gaps
  const useComputedSummary = gapSummary && gapSummary.totalSourcePermissions > 0;

  return (
    <div className="space-y-4">
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
                    Permission Coverage
                  </div>
                </div>
                <p className="text-sm">
                  <span className="font-medium">{gapSummary.coveredPermissions}</span> of{" "}
                  <span className="font-medium">{gapSummary.totalSourcePermissions}</span>{" "}
                  source permissions are covered by target roles
                </p>
                {gapSummary.gapsByPersona.length > 0 && (
                  <p className="text-sm text-amber-700 mt-1">
                    {gapSummary.totalSourcePermissions - gapSummary.coveredPermissions} uncovered permissions across{" "}
                    {gapSummary.gapsByPersona.length} persona{gapSummary.gapsByPersona.length !== 1 ? "s" : ""}
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

      {/* Gaps by Persona — from computed summary */}
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
                  <Badge variant="outline" className="text-xs">
                    {pg.uncoveredCount} uncovered / {pg.totalPermissions} total
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            {expandedPersona === pg.personaName && (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pg.uncoveredPermissions.map((p) => (
                      <TableRow key={p.permissionId}>
                        <TableCell className="font-mono text-xs">{p.permissionId}</TableCell>
                        <TableCell className="text-sm">{p.permissionName ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.description ?? "—"}</TableCell>
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
                <Badge variant="outline" className="text-xs">
                  {personaGaps.length} uncovered permissions
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
