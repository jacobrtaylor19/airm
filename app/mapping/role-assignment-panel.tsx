"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2, Search, X, Save, GripVertical, TrendingUp, Sparkles } from "lucide-react";
import type { PersonaMappingRow, TargetRoleRow, PersonaSodConflict } from "@/lib/queries";
import type { PersonaDetailInfo } from "./mapping-client";

export interface RoleAssignmentPanelProps {
  selectedPersona: PersonaMappingRow | undefined;
  selectedDetail: PersonaDetailInfo | null;
  selectedPersonaId: number | null;
  localMappedIds: number[];
  isDirty: boolean;
  savingMapping: boolean;
  dropZoneActive: "mapped" | "available" | null;
  setDropZoneActive: (zone: "mapped" | "available" | null) => void;
  dragRoleIdRef: React.MutableRefObject<number | null>;
  dragSourceRef: React.MutableRefObject<"mapped" | "available" | null>;
  targetRoles: TargetRoleRow[];
  sodConflictsByPersona: Record<number, PersonaSodConflict[]>;
  personaSourceSystems: Record<number, string[]>;
  excessThreshold: number;
  roleSearch: string;
  setRoleSearch: (v: string) => void;
  onAddRole: (roleId: number) => void;
  onRemoveRole: (roleId: number) => void;
  onSaveMappings: () => void;
  userRole?: string;
  onOpenAISuggest?: () => void;
}

export function RoleAssignmentPanel({
  selectedPersona,
  selectedDetail,
  selectedPersonaId,
  localMappedIds,
  isDirty,
  savingMapping,
  dropZoneActive,
  setDropZoneActive,
  dragRoleIdRef,
  dragSourceRef,
  targetRoles,
  sodConflictsByPersona,
  personaSourceSystems,
  excessThreshold,
  roleSearch,
  setRoleSearch,
  onAddRole,
  onRemoveRole,
  onSaveMappings,
  userRole,
  onOpenAISuggest,
}: RoleAssignmentPanelProps) {
  const canAISuggest = userRole && ["system_admin", "admin", "mapper"].includes(userRole);
  return (
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
                  <div className="flex items-center gap-2">
                    {canAISuggest && onOpenAISuggest && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1.5 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
                        onClick={onOpenAISuggest}
                        title="Get AI-powered role suggestions"
                      >
                        <Sparkles className="h-3 w-3" />
                        AI Suggest
                      </Button>
                    )}
                    {isDirty && (
                      <Button size="sm" className="h-7 text-xs gap-1.5" onClick={onSaveMappings} disabled={savingMapping}>
                        {savingMapping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save
                      </Button>
                    )}
                  </div>
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
                      onAddRole(dragRoleIdRef.current);
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
                              onClick={() => onRemoveRole(roleId)}
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
                      onRemoveRole(dragRoleIdRef.current);
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
  );
}
