"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Circle, Loader2, Sparkles, Search, ChevronRight, X, Save, GripVertical, TrendingUp, ListChecks, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { PersonaMappingRow, UserRefinementRow, GapRow, TargetRoleRow, PersonaSodConflict, GapAnalysisSummary, UserRefinementDetail } from "@/lib/queries";

interface PersonaDetailInfo {
  sourcePermissionCount: number;
  mappedRoles: { targetRoleId: number; roleName: string; roleId: string; coveragePercent: number | null; excessPercent: number | null; confidence: string | null; roleOwner: string | null }[];
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
  excessThreshold?: number;
  userRole?: string;
}

export function MappingClient({ personas, personaDetails, gaps, targetRoles, sodConflictsByPersona = {}, personaSourceSystems = {}, gapSummary, refinementDetails = [], excessThreshold = 30, userRole }: MappingClientProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(personas[0]?.personaId ?? null);
  const [autoMapping, setAutoMapping] = useState(false);
  const [autoMapProgress, setAutoMapProgress] = useState<{ processed: number; total: number } | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const [bulkTargetRoleId, setBulkTargetRoleId] = useState<number | null>(null);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const router = useRouter();

  // Drag-and-drop mapping state
  const [localMappedIds, setLocalMappedIds] = useState<number[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [savingMapping, setSavingMapping] = useState(false);
  const [dropZoneActive, setDropZoneActive] = useState<"mapped" | "available" | null>(null);
  const dragRoleIdRef = useRef<number | null>(null);
  const dragSourceRef = useRef<"mapped" | "available" | null>(null);

  // Sync local state when selected persona changes
  useEffect(() => {
    if (selectedPersonaId && personaDetails[selectedPersonaId]) {
      setLocalMappedIds(personaDetails[selectedPersonaId].mappedRoles.map((r) => r.targetRoleId));
      setIsDirty(false);
    } else {
      setLocalMappedIds([]);
      setIsDirty(false);
    }
  }, [selectedPersonaId, personaDetails]);

  function addRole(roleId: number) {
    setLocalMappedIds((prev) => prev.includes(roleId) ? prev : [...prev, roleId]);
    setIsDirty(true);
  }

  function removeRole(roleId: number) {
    setLocalMappedIds((prev) => prev.filter((id) => id !== roleId));
    setIsDirty(true);
  }

  async function saveMappings() {
    if (!selectedPersonaId) return;
    setSavingMapping(true);
    try {
      const res = await fetch("/api/mapping/persona-roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: selectedPersonaId, targetRoleIds: localMappedIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save mapping");
      } else {
        toast.success("Mapping saved");
        setIsDirty(false);
        router.refresh();
      }
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSavingMapping(false);
    }
  }

  const [roleSearch, setRoleSearch] = useState("");
  const selectedDetail = selectedPersonaId ? personaDetails[selectedPersonaId] : null;
  const selectedPersona = personas.find(p => p.personaId === selectedPersonaId);

  async function autoMapAll() {
    setAutoMapping(true);
    setAutoMapProgress(null);
    let jobId: number | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    try {
      // Start the job — this returns immediately with jobId
      const res = await fetch("/api/ai/target-role-mapping", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`Auto-map failed: ${data.error}`);
        return;
      }
      jobId = data.jobId;

      // Poll for progress every 1.5s
      if (jobId) {
        pollTimer = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/jobs/${jobId}`);
            if (statusRes.ok) {
              const status = await statusRes.json();
              setAutoMapProgress({
                processed: status.processed || 0,
                total: status.totalRecords || 0,
              });
              if (status.status === "completed" || status.status === "failed") {
                if (pollTimer) clearInterval(pollTimer);
              }
            }
          } catch { /* ignore polling errors */ }
        }, 1500);
      }

      // Wait for the actual result (the POST blocks until done)
      // Since we already have the response, just show success
      toast.success(`Mapped ${data.personasMapped} personas with ${data.totalMappings} role assignments`);
    } catch (err) {
      toast.error(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      if (pollTimer) clearInterval(pollTimer);
      setAutoMapping(false);
      setAutoMapProgress(null);
      router.refresh();
    }
  }

  async function bulkAssign() {
    if (!bulkTargetRoleId || bulkSelected.size === 0) return;
    setBulkAssigning(true);
    try {
      const res = await fetch("/api/mapping/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaIds: Array.from(bulkSelected), targetRoleId: bulkTargetRoleId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Bulk assign failed");
      } else {
        const data = await res.json();
        toast.success(`Assigned ${data.created} persona(s). ${data.skipped} already mapped.`);
        setBulkMode(false);
        setBulkSelected(new Set());
        setBulkTargetRoleId(null);
        router.refresh();
      }
    } catch {
      toast.error("Bulk assign failed");
    } finally {
      setBulkAssigning(false);
    }
  }

  function toggleBulkSelect(personaId: number) {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(personaId)) next.delete(personaId);
      else next.add(personaId);
      return next;
    });
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
        <TabsTrigger value="refinements">User Role Assignments</TabsTrigger>
        <TabsTrigger value="gap-analysis">Gap Analysis</TabsTrigger>
      </TabsList>

      {/* Tab A: Persona Mapping */}
      <TabsContent value="persona-mapping" className="mt-4">
        {userRole && ["system_admin", "admin", "mapper"].includes(userRole) && (
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button onClick={autoMapAll} disabled={autoMapping || bulkMode} className="bg-teal-500 hover:bg-teal-600 text-white">
                {autoMapping ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Auto-Mapping...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Auto-Map All (Least Access)</>
                )}
              </Button>
              {autoMapping && autoMapProgress && autoMapProgress.total > 0 && (
                <div className="flex items-center gap-2 min-w-[200px]">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((autoMapProgress.processed / autoMapProgress.total) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {autoMapProgress.processed}/{autoMapProgress.total}
                  </span>
                </div>
              )}
            </div>
            <Button variant={bulkMode ? "default" : "outline"} onClick={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()); setBulkTargetRoleId(null); }} disabled={autoMapping}>
              <ListChecks className="h-4 w-4 mr-2" /> {bulkMode ? "Exit Bulk Mode" : "Bulk Assign"}
            </Button>
            {bulkMode && (
              <>
                <span className="text-sm text-muted-foreground">{bulkSelected.size} selected</span>
                <Button variant="ghost" size="sm" onClick={() => setBulkSelected(new Set(personas.map(p => p.personaId)))}>Select All</Button>
                <Button variant="ghost" size="sm" onClick={() => setBulkSelected(new Set())}>Clear</Button>
                <select
                  value={bulkTargetRoleId ?? ""}
                  onChange={(e) => setBulkTargetRoleId(e.target.value ? parseInt(e.target.value) : null)}
                  className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  <option value="">Select target role...</option>
                  {targetRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.roleName}</option>
                  ))}
                </select>
                <Button onClick={bulkAssign} disabled={bulkAssigning || !bulkTargetRoleId || bulkSelected.size === 0}>
                  {bulkAssigning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Assign to Selected
                </Button>
              </>
            )}
          </div>
        )}

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
                        isSelected ? "bg-indigo-50 border-l-2 border-l-indigo-500" : "hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedPersonaId(p.personaId)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {bulkMode && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-primary shrink-0"
                            checked={bulkSelected.has(p.personaId)}
                            onChange={(e) => { e.stopPropagation(); toggleBulkSelect(p.personaId); }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
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

                  {/* Least Access Warning Banner */}
                  {selectedPersonaId && selectedDetail.mappedRoles.some(r => r.excessPercent != null && r.excessPercent >= excessThreshold) && (
                    <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-orange-800">
                            Over-Provisioning Detected
                          </p>
                          <p className="text-orange-700 mt-1">
                            {selectedDetail.mappedRoles.filter(r => r.excessPercent != null && r.excessPercent >= excessThreshold).length} role{selectedDetail.mappedRoles.filter(r => r.excessPercent != null && r.excessPercent >= excessThreshold).length !== 1 ? "s" : ""} exceed the {excessThreshold}% excess threshold. Remove roles or accept exceptions in the Provisioning Alerts section on the dashboard.
                          </p>
                          <a href="/dashboard" className="inline-block mt-2 text-xs font-medium text-orange-700 underline hover:text-orange-900">
                            View Provisioning Alerts on dashboard &rarr;
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Drag-and-drop mapping */}
                  <div className="space-y-3">
                    {/* Mapped Roles drop zone */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-sm font-medium">Mapped Target Roles ({localMappedIds.length})</h4>
                        {isDirty && (
                          <Button size="sm" className="h-7 text-xs gap-1.5" onClick={saveMappings} disabled={savingMapping}>
                            {savingMapping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Save
                          </Button>
                        )}
                      </div>
                      <div
                        className={`min-h-[80px] rounded-md border-2 border-dashed p-2 transition-colors ${
                          dropZoneActive === "mapped"
                            ? "border-primary bg-primary/5"
                            : "border-border bg-muted/20"
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setDropZoneActive("mapped"); }}
                        onDragLeave={() => setDropZoneActive(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDropZoneActive(null);
                          if (dragRoleIdRef.current !== null && dragSourceRef.current === "available") {
                            addRole(dragRoleIdRef.current);
                          }
                        }}
                      >
                        {localMappedIds.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            Drag roles here from &quot;Available&quot; below, or run Auto-Map.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {localMappedIds.map((roleId) => {
                              const roleInfo = targetRoles.find((r) => r.id === roleId);
                              const dbInfo = selectedDetail.mappedRoles.find((m) => m.targetRoleId === roleId);
                              if (!roleInfo) return null;
                              const isOverProvisioned = dbInfo?.excessPercent != null && dbInfo.excessPercent >= excessThreshold;
                              return (
                                <div
                                  key={roleId}
                                  draggable
                                  onDragStart={() => { dragRoleIdRef.current = roleId; dragSourceRef.current = "mapped"; }}
                                  onDragEnd={() => { dragRoleIdRef.current = null; dragSourceRef.current = null; }}
                                  className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs cursor-grab active:cursor-grabbing group ${
                                    isOverProvisioned
                                      ? "bg-orange-50 border-orange-300"
                                      : "bg-primary/10 border-primary/30"
                                  }`}
                                  title={isOverProvisioned ? `Over-provisioned: ${dbInfo!.excessPercent!.toFixed(0)}% excess permissions` : undefined}
                                >
                                  <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                                  {isOverProvisioned && (
                                    <TrendingUp className="h-3 w-3 text-orange-500 shrink-0" />
                                  )}
                                  <span className={`font-medium ${isOverProvisioned ? "text-orange-700" : "text-primary"}`}>
                                    {roleInfo.roleName}
                                  </span>
                                  {isOverProvisioned && (
                                    <span className="text-[9px] text-orange-500 font-medium">
                                      +{dbInfo!.excessPercent!.toFixed(0)}%
                                    </span>
                                  )}
                                  {!isOverProvisioned && dbInfo?.confidence && dbInfo.confidence !== "manual" && (
                                    <span className={`text-[9px] ml-0.5 font-medium ${dbInfo.confidence === "high" ? "text-teal-600" : dbInfo.confidence === "medium" ? "text-blue-500" : "text-muted-foreground"}`}>
                                      ({dbInfo.confidence})
                                    </span>
                                  )}
                                  <button
                                    onClick={() => removeRole(roleId)}
                                    className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors opacity-50 group-hover:opacity-100"
                                    title="Remove role"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Available Roles drop zone */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-sm font-medium text-muted-foreground">
                          Available Target Roles ({targetRoles.filter((r) => !localMappedIds.includes(r.id)).length})
                        </h4>
                        <div className="relative w-48">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                          <Input
                            placeholder="Filter roles..."
                            value={roleSearch}
                            onChange={(e) => setRoleSearch(e.target.value)}
                            className="h-7 text-xs pl-7"
                          />
                        </div>
                      </div>
                      <div
                        className={`min-h-[60px] rounded-md border-2 border-dashed p-2 transition-colors ${
                          dropZoneActive === "available"
                            ? "border-muted-foreground/40 bg-muted/30"
                            : "border-transparent"
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setDropZoneActive("available"); }}
                        onDragLeave={() => setDropZoneActive(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDropZoneActive(null);
                          if (dragRoleIdRef.current !== null && dragSourceRef.current === "mapped") {
                            removeRole(dragRoleIdRef.current);
                          }
                        }}
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {targetRoles
                            .filter((r) => !localMappedIds.includes(r.id))
                            .filter((r) => !roleSearch || r.roleName.toLowerCase().includes(roleSearch.toLowerCase()))
                            .map((r) => (
                              <div
                                key={r.id}
                                draggable
                                onDragStart={() => { dragRoleIdRef.current = r.id; dragSourceRef.current = "available"; }}
                                onDragEnd={() => { dragRoleIdRef.current = null; dragSourceRef.current = null; }}
                                className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors"
                              >
                                <GripVertical className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                                <span>{r.roleName}</span>
                              </div>
                            ))}
                          {targetRoles.filter((r) => !localMappedIds.includes(r.id)).length === 0 && (
                            <p className="text-xs text-muted-foreground py-2">All roles have been mapped.</p>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Drag roles up to Mapped, or drag Mapped roles here to remove.
                      </p>
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

      {/* Tab B: User Role Assignments */}
      <TabsContent value="refinements" className="mt-4">
        <RefinementsTab
          refinementDetails={refinementDetails}
          targetRoles={targetRoles}
          refinementCount={refinementCount}
          totalUsersWithAssignments={totalUsersWithAssignments}
          userRole={userRole}
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
// User Role Assignments Tab
// ─────────────────────────────────────────────

function getUserStatus(u: UserRefinementDetail): string {
  const currentWave = u.allAssignments.filter(a => a.releasePhase !== "existing");
  if (currentWave.length === 0) return "none";
  const statuses = currentWave.map(a => a.status);
  if (statuses.some(s => s === "sod_rejected")) return "sod_rejected";
  if (statuses.every(s => s === "approved")) return "approved";
  if (statuses.some(s => s === "compliance_approved" || s === "ready_for_approval")) return "sod_clean";
  if (statuses.some(s => s === "pending_review")) return "pending_review";
  return "draft";
}

function StatusBadgeInline({ status }: { status: string }) {
  switch (status) {
    case "draft": return <Badge variant="outline" className="text-xs bg-slate-50">Draft</Badge>;
    case "pending_review": return <Badge className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">Pending Review</Badge>;
    case "sod_clean": return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">SOD Clean</Badge>;
    case "sod_rejected": return <Badge className="text-xs bg-red-100 text-red-700 border-red-200">SOD Conflict</Badge>;
    case "approved": return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Approved</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}

function RefinementsTab({
  refinementDetails,
  targetRoles,
  totalUsersWithAssignments,
  userRole,
}: {
  refinementDetails: UserRefinementDetail[];
  targetRoles: TargetRoleRow[];
  refinementCount?: number;
  totalUsersWithAssignments: number;
  userRole?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editRoles, setEditRoles] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const router = useRouter();

  const isExecutor = userRole && ["system_admin", "admin", "mapper"].includes(userRole);
  const selectedUser = refinementDetails.find(u => u.userId === selectedUserId);

  // Unique departments for filter
  const departments = Array.from(new Set(refinementDetails.map(u => u.department).filter((d): d is string => d !== null))).sort();

  // Status counts
  const statusCounts = refinementDetails.reduce((acc, u) => {
    const s = getUserStatus(u);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter users
  const filteredDetails = refinementDetails.filter(u => {
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
      const user = refinementDetails.find(u => u.userId === userId);
      if (!user) return;
      const draftIds = user.allAssignments.filter(a => a.status === "draft").map(a => a.assignmentId);
      if (draftIds.length === 0) { toast.error("No draft assignments to submit"); return; }
      const res = await fetch("/api/mapping/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentIds: draftIds }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Failed to submit");
      else { toast.success(`${data.updated} assignment${data.updated === 1 ? "" : "s"} submitted for review`); router.refresh(); }
    } catch { toast.error("Failed to submit"); }
    finally { setSubmittingSingle(false); }
  }

  async function bulkSubmitForReview() {
    setSubmittingBulk(true);
    try {
      const allDraftIds: number[] = [];
      const selectedArr = Array.from(selectedIds);
      for (const userId of selectedArr) {
        const user = refinementDetails.find(u => u.userId === userId);
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
      if (!res.ok) toast.error(data.error || "Failed to submit");
      else { toast.success(`${data.updated} assignment${data.updated === 1 ? "" : "s"} submitted for review`); setSelectedIds(new Set()); router.refresh(); }
    } catch { toast.error("Failed to submit"); }
    finally { setSubmittingBulk(false); }
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
            <p className="text-xl font-bold mt-0.5 text-indigo-600">{statusCounts["pending_review"] || 0}</p>
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
            className="h-8 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
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
                      {isExecutor && <TableHead className="w-8"></TableHead>}
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
                          <TableCell className="text-sm">{u.department ?? "—"}</TableCell>
                          <TableCell className="text-sm">{u.personaName ?? "—"}</TableCell>
                          <TableCell className="text-sm">{u.allAssignments.length}</TableCell>
                          <TableCell><StatusBadgeInline status={status} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {isExecutor && isDraft && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
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
                  <p><span className="text-muted-foreground">Department:</span> {selectedUser.department ?? "—"}</p>
                </div>

                {!isEditable && (
                  <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
                    Assignments are locked ({selectedUserStatus === "pending_review" ? "pending SOD review" : selectedUserStatus.replace("_", " ")}). Send back to Draft to edit.
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
                          className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-xs transition-colors ${
                            !isEditable ? "opacity-60" : "cursor-pointer"
                          } ${isAssigned ? "bg-primary/5 border-primary/30" : isEditable ? "hover:bg-muted/50" : ""}`}
                          onClick={() => isEditable && toggleRole(r.id)}
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
                      className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50"
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
