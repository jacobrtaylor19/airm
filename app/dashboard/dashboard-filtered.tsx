"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DepartmentMappingStatus } from "@/lib/queries";

interface Props {
  allDepts: DepartmentMappingStatus[];
  assignedDepartments: string[] | null;
  userRole: string;
  sodConflicts: { severity: string; count: number }[];
  lowConfidence: number;
  sodRulesCount: number;
  personasWithMapping: number;
  totalPersonas: number;
}

function DeptProgressBar({ depts }: { depts: DepartmentMappingStatus[] }) {
  return (
    <div className="space-y-4">
      {depts.map((dept) => (
        <div key={dept.department} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{dept.department}</span>
            <span className="text-xs text-muted-foreground">{dept.totalUsers} users</span>
          </div>
          <div className="flex h-2 rounded-full bg-muted overflow-hidden">
            {dept.approved > 0 && (
              <div className="h-2 bg-emerald-500" style={{ width: `${(dept.approved / dept.totalUsers) * 100}%` }} />
            )}
            {dept.sodClean - dept.approved > 0 && (
              <div className="h-2 bg-blue-500" style={{ width: `${((dept.sodClean - dept.approved) / dept.totalUsers) * 100}%` }} />
            )}
            {dept.mapped - dept.sodClean > 0 && (
              <div className="h-2 bg-yellow-500" style={{ width: `${((dept.mapped - dept.sodClean) / dept.totalUsers) * 100}%` }} />
            )}
            {dept.withPersona - dept.mapped > 0 && (
              <div className="h-2 bg-zinc-400" style={{ width: `${((dept.withPersona - dept.mapped) / dept.totalUsers) * 100}%` }} />
            )}
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{dept.withPersona} persona</span>
            <span>{dept.mapped} mapped</span>
            <span>{dept.sodClean} SOD ok</span>
            <span>{dept.approved} approved</span>
          </div>
        </div>
      ))}
      {depts.length > 0 && (
        <div className="flex gap-4 text-xs pt-2 border-t">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> SOD Clean</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Mapped</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-400" /> Persona Only</span>
        </div>
      )}
    </div>
  );
}

export function DashboardFiltered({ allDepts, assignedDepartments, userRole, sodConflicts, lowConfidence, sodRulesCount, personasWithMapping, totalPersonas }: Props) {
  const allDeptNames = allDepts.map((d) => d.department).sort();

  // For mapper/approver, default to their assigned departments
  // For admin/viewer, default to all departments
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(
    new Set(assignedDepartments ?? allDeptNames)
  );

  function toggleDept(dept: string) {
    setSelectedDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) {
        if (next.size > 1) next.delete(dept); // Don't allow empty selection
      } else {
        next.add(dept);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedDepts(new Set(allDeptNames));
  }

  function selectAssigned() {
    if (assignedDepartments) setSelectedDepts(new Set(assignedDepartments));
  }

  const filteredDepts = useMemo(() => {
    return allDepts
      .filter((d) => selectedDepts.has(d.department))
      .sort((a, b) => {
        const scoreA = a.approved > 0 ? 4 : a.sodClean > 0 ? 3 : a.mapped > 0 ? 2 : a.withPersona > 0 ? 1 : 0;
        const scoreB = b.approved > 0 ? 4 : b.sodClean > 0 ? 3 : b.mapped > 0 ? 2 : b.withPersona > 0 ? 1 : 0;
        return scoreB - scoreA || a.department.localeCompare(b.department);
      });
  }, [allDepts, selectedDepts]);

  const scopedTotals = useMemo(() => {
    return {
      users: filteredDepts.reduce((s, d) => s + d.totalUsers, 0),
      persona: filteredDepts.reduce((s, d) => s + d.withPersona, 0),
      mapped: filteredDepts.reduce((s, d) => s + d.mapped, 0),
      sodClean: filteredDepts.reduce((s, d) => s + d.sodClean, 0),
      approved: filteredDepts.reduce((s, d) => s + d.approved, 0),
    };
  }, [filteredDepts]);

  const isFiltered = selectedDepts.size < allDeptNames.length;

  return (
    <>
      {/* Scoped Summary + Filter */}
      <Card className={isFiltered ? "border-primary/20 bg-primary/[0.02]" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {isFiltered ? "Filtered View" : "All Departments"}
              {assignedDepartments && isFiltered && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {userRole === "mapper" ? "My Mapping Scope" : userRole === "approver" ? "My Approval Scope" : "Filtered"}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {assignedDepartments && (
                <button
                  onClick={selectAssigned}
                  className={`text-xs px-2 py-1 rounded ${isFiltered ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  My Scope
                </button>
              )}
              <button
                onClick={selectAll}
                className={`text-xs px-2 py-1 rounded ${!isFiltered ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                All
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Department chips */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {allDeptNames.map((dept) => (
              <button
                key={dept}
                onClick={() => toggleDept(dept)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  selectedDepts.has(dept)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "text-muted-foreground border-muted hover:border-foreground/20"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Scoped KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Users</p>
              <p className="text-xl font-bold tabular-nums">{scopedTotals.users}</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Persona Assigned</p>
              <p className="text-xl font-bold tabular-nums">{scopedTotals.persona}</p>
              <p className="text-xs text-muted-foreground">{scopedTotals.users > 0 ? Math.round((scopedTotals.persona / scopedTotals.users) * 100) : 0}%</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Mapped</p>
              <p className="text-xl font-bold tabular-nums">{scopedTotals.mapped}</p>
              <p className="text-xs text-muted-foreground">{scopedTotals.users > 0 ? Math.round((scopedTotals.mapped / scopedTotals.users) * 100) : 0}%</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">SOD Clean</p>
              <p className="text-xl font-bold tabular-nums">{scopedTotals.sodClean}</p>
              <p className="text-xs text-muted-foreground">{scopedTotals.users > 0 ? Math.round((scopedTotals.sodClean / scopedTotals.users) * 100) : 0}%</p>
            </div>
            <div className="rounded-md border bg-background p-3">
              <p className="text-xs text-muted-foreground">Approved</p>
              <p className="text-xl font-bold tabular-nums">{scopedTotals.approved}</p>
              <p className="text-xs text-muted-foreground">{scopedTotals.users > 0 ? Math.round((scopedTotals.approved / scopedTotals.users) * 100) : 0}%</p>
            </div>
          </div>

          {/* Department Progress Bars */}
          <DeptProgressBar depts={filteredDepts} />
        </CardContent>
      </Card>

      {/* Attention Required */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Attention Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sodConflicts.length > 0 ? (
            sodConflicts.map((s) => (
              <div key={s.severity} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="capitalize">{s.severity} SOD conflicts</span>
                <span className="font-semibold tabular-nums">{s.count}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No SOD conflicts detected yet</p>
          )}
          {lowConfidence > 0 && (
            <div className="flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm">
              <span>Low confidence assignments (&lt;65%)</span>
              <span className="font-semibold tabular-nums">{lowConfidence}</span>
            </div>
          )}
          {totalPersonas > 0 && personasWithMapping === 0 && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>No personas mapped to target roles yet</span>
            </div>
          )}
          {sodRulesCount === 0 && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground">
              <span>SOD ruleset not uploaded — analysis will be skipped</span>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
