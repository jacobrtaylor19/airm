"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { PersonaMappingRow, UserRefinementRow, GapRow, TargetRoleRow, PersonaSodConflict, GapAnalysisSummary, UserRefinementDetail } from "@/lib/queries";

import { PersonaSelector } from "./persona-selector";
import { RoleAssignmentPanel } from "./role-assignment-panel";
import { AutoMapProgress } from "./auto-map-progress";
import { RefinementsTab, GapAnalysisTab } from "./user-refinements";

export interface PersonaDetailInfo {
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
      // Start the job -- this returns immediately with jobId
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
        <AutoMapProgress
          userRole={userRole}
          autoMapping={autoMapping}
          autoMapProgress={autoMapProgress}
          bulkMode={bulkMode}
          bulkSelected={bulkSelected}
          bulkTargetRoleId={bulkTargetRoleId}
          bulkAssigning={bulkAssigning}
          targetRoles={targetRoles}
          personaIds={personas.map(p => p.personaId)}
          onAutoMapAll={autoMapAll}
          onToggleBulkMode={() => { setBulkMode(!bulkMode); setBulkSelected(new Set()); setBulkTargetRoleId(null); }}
          onSelectAll={() => setBulkSelected(new Set(personas.map(p => p.personaId)))}
          onClearSelection={() => setBulkSelected(new Set())}
          onSetBulkTargetRoleId={setBulkTargetRoleId}
          onBulkAssign={bulkAssign}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <PersonaSelector
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            onSelectPersona={setSelectedPersonaId}
            bulkMode={bulkMode}
            bulkSelected={bulkSelected}
            onToggleBulkSelect={toggleBulkSelect}
            onSelectAllVisible={(ids) => setBulkSelected(new Set(ids))}
            onClearSelection={() => setBulkSelected(new Set())}
            personaSourceSystems={personaSourceSystems}
            personaDetails={personaDetails}
          />

          <RoleAssignmentPanel
            selectedPersona={selectedPersona}
            selectedDetail={selectedDetail}
            selectedPersonaId={selectedPersonaId}
            localMappedIds={localMappedIds}
            isDirty={isDirty}
            savingMapping={savingMapping}
            dropZoneActive={dropZoneActive}
            setDropZoneActive={setDropZoneActive}
            dragRoleIdRef={dragRoleIdRef}
            dragSourceRef={dragSourceRef}
            targetRoles={targetRoles}
            sodConflictsByPersona={sodConflictsByPersona}
            personaSourceSystems={personaSourceSystems}
            excessThreshold={excessThreshold}
            roleSearch={roleSearch}
            setRoleSearch={setRoleSearch}
            onAddRole={addRole}
            onRemoveRole={removeRole}
            onSaveMappings={saveMappings}
          />
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
