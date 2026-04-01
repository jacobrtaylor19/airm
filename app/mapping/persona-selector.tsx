"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, Circle, Search, Filter } from "lucide-react";
import type { PersonaMappingRow } from "@/lib/queries";
import type { PersonaDetailInfo } from "./mapping-client";

type PersonaFilter = "all" | "unmapped" | "low-coverage";

export interface PersonaSelectorProps {
  personas: PersonaMappingRow[];
  selectedPersonaId: number | null;
  onSelectPersona: (id: number) => void;
  bulkMode: boolean;
  bulkSelected: Set<number>;
  onToggleBulkSelect: (id: number) => void;
  onSelectAllVisible: (ids: number[]) => void;
  onClearSelection: () => void;
  personaSourceSystems: Record<number, string[]>;
  personaDetails: Record<number, PersonaDetailInfo>;
}

function getMaxCoverage(detail: PersonaDetailInfo | undefined): number | null {
  if (!detail || detail.mappedRoles.length === 0) return null;
  const coverages = detail.mappedRoles
    .map((r) => r.coveragePercent)
    .filter((c): c is number => c !== null);
  if (coverages.length === 0) return null;
  return Math.max(...coverages);
}

export function PersonaSelector({
  personas,
  selectedPersonaId,
  onSelectPersona,
  bulkMode,
  bulkSelected,
  onToggleBulkSelect,
  onSelectAllVisible,
  onClearSelection,
  personaSourceSystems,
  personaDetails,
}: PersonaSelectorProps) {
  const [filter, setFilter] = useState<PersonaFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPersonas = personas.filter((p) => {
    // Text search
    if (searchQuery && !p.personaName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    // Filter by mapping status
    if (filter === "unmapped") return p.mappedRoleCount === 0;
    if (filter === "low-coverage") {
      const maxCov = getMaxCoverage(personaDetails[p.personaId]);
      return maxCov !== null && maxCov < 70;
    }
    return true;
  });

  const unmappedCount = personas.filter((p) => p.mappedRoleCount === 0).length;
  const lowCoverageCount = personas.filter((p) => {
    const maxCov = getMaxCoverage(personaDetails[p.personaId]);
    return maxCov !== null && maxCov < 70;
  }).length;

  const allVisibleSelected = filteredPersonas.length > 0 && filteredPersonas.every((p) => bulkSelected.has(p.personaId));

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Personas ({personas.length})</CardTitle>
        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search personas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs pl-8"
          />
        </div>
        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            className="h-6 text-[11px] px-2"
            onClick={() => setFilter("all")}
          >
            All ({personas.length})
          </Button>
          <Button
            variant={filter === "unmapped" ? "default" : "outline"}
            size="sm"
            className="h-6 text-[11px] px-2"
            onClick={() => setFilter("unmapped")}
          >
            <Circle className="h-3 w-3 mr-1" />
            Unmapped ({unmappedCount})
          </Button>
          <Button
            variant={filter === "low-coverage" ? "default" : "outline"}
            size="sm"
            className="h-6 text-[11px] px-2"
            onClick={() => setFilter("low-coverage")}
          >
            <Filter className="h-3 w-3 mr-1" />
            Low Coverage ({lowCoverageCount})
          </Button>
        </div>
        {/* Bulk selection controls */}
        {bulkMode && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={allVisibleSelected}
              onChange={() => {
                if (allVisibleSelected) {
                  onClearSelection();
                } else {
                  onSelectAllVisible(filteredPersonas.map((p) => p.personaId));
                }
              }}
            />
            <span className="text-xs text-muted-foreground">
              {allVisibleSelected ? "Deselect All" : "Select All"} ({filteredPersonas.length} shown)
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-y-auto">
          {filteredPersonas.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              No personas match the current filter.
            </p>
          )}
          {filteredPersonas.map((p) => {
            const isSelected = selectedPersonaId === p.personaId;
            const isMapped = p.mappedRoleCount > 0;
            const maxCov = getMaxCoverage(personaDetails[p.personaId]);
            return (
              <div
                key={p.personaId}
                className={`flex items-center justify-between px-4 py-2.5 cursor-pointer border-b text-sm ${
                  isSelected ? "bg-teal-50 border-l-2 border-l-teal-500" : "hover:bg-muted/50"
                }`}
                onClick={() => onSelectPersona(p.personaId)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {bulkMode && (
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary shrink-0"
                      checked={bulkSelected.has(p.personaId)}
                      onChange={(e) => { e.stopPropagation(); onToggleBulkSelect(p.personaId); }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  {isMapped ? (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.personaName}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {p.userCount} users
                      </p>
                      {maxCov !== null && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 h-3.5 font-normal ${
                            maxCov >= 90
                              ? "border-green-300 text-green-700"
                              : maxCov >= 70
                              ? "border-blue-300 text-blue-700"
                              : "border-orange-300 text-orange-700"
                          }`}
                        >
                          {maxCov.toFixed(0)}% cov
                        </Badge>
                      )}
                    </div>
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
  );
}
