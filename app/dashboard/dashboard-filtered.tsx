"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TrendingUp, Loader2 } from "lucide-react";
import type { DepartmentMappingStatus } from "@/lib/queries";

interface ProvisioningAlert {
  personaId: number;
  personaName: string;
  userCount: number;
  mappingId: number;
  targetRoleId: number;
  roleName: string;
  excessPercent: number;
  exceptionStatus: string | null;
  exceptionId: number | null;
}

interface Props {
  allDepts: DepartmentMappingStatus[];
  assignedDepartments: string[] | null;
  userRole: string;
  sodConflicts: { severity: string; count: number }[];
  lowConfidence: number;
  sodRulesCount: number;
  personasWithMapping: number;
  totalPersonas: number;
  overprovisioningAlerts: ProvisioningAlert[];
}

const STAGES = [
  { key: "noPersona",   label: "No Persona",    color: "bg-zinc-200 text-zinc-600",        dot: "bg-zinc-400"   },
  { key: "persona",     label: "Persona",       color: "bg-slate-100 text-slate-600",      dot: "bg-slate-400"  },
  { key: "mapped",      label: "Mapped",        color: "bg-yellow-50 text-yellow-700",     dot: "bg-yellow-500" },
  { key: "sodRejected", label: "SOD Conflict",  color: "bg-red-50 text-red-700",           dot: "bg-red-500"    },
  { key: "sodClean",    label: "SOD Clean",     color: "bg-blue-50 text-blue-700",         dot: "bg-blue-500"   },
  { key: "approved",    label: "Approved",      color: "bg-emerald-50 text-emerald-700",   dot: "bg-emerald-500"},
] as const;

type StageKey = typeof STAGES[number]["key"];

function deptStageCounts(dept: DepartmentMappingStatus): Record<StageKey, number> {
  const noPersona    = dept.totalUsers - dept.withPersona;
  const persona      = dept.withPersona - dept.mapped;
  const mapped       = Math.max(0, dept.mapped - dept.sodClean - dept.sodRejected);
  const sodRejected  = dept.sodRejected;
  const sodClean     = Math.max(0, dept.sodClean - dept.approved);
  const approved     = dept.approved;
  return { noPersona, persona, mapped, sodRejected, sodClean, approved };
}

function DeptKanbanGrid({ depts }: { depts: DepartmentMappingStatus[] }) {
  if (depts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="hidden sm:grid grid-cols-6 gap-1 text-[10px] font-medium text-muted-foreground px-3">
        {STAGES.map((s) => (
          <div key={s.key} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${s.dot} shrink-0`} />
            {s.label}
          </div>
        ))}
      </div>

      {depts.map((dept) => {
        const counts = deptStageCounts(dept);
        const pct = dept.totalUsers > 0 ? Math.round((dept.approved / dept.totalUsers) * 100) : 0;
        const isComplete  = dept.approved > 0 && dept.approved === dept.totalUsers;
        const hasConflict = dept.sodRejected > 0;

        return (
          <div
            key={dept.department}
            className={`rounded-lg border bg-card px-4 py-3 transition-colors ${
              isComplete  ? "border-emerald-300 bg-emerald-50/30" :
              hasConflict ? "border-red-200 bg-red-50/20" :
              "border-border"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{dept.department}</span>
                {isComplete && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Complete</span>
                )}
                {hasConflict && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">{dept.sodRejected} conflict{dept.sodRejected !== 1 ? "s" : ""}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{dept.totalUsers} users</span>
                <span className="text-xs font-semibold tabular-nums text-muted-foreground">{pct}%</span>
              </div>
            </div>

            <div className="flex h-1.5 rounded-full bg-muted overflow-hidden mb-2.5">
              {STAGES.map((s) => {
                const count = counts[s.key];
                if (count <= 0 || dept.totalUsers === 0) return null;
                return (
                  <div
                    key={s.key}
                    className={`h-full ${s.dot}`}
                    style={{ width: `${(count / dept.totalUsers) * 100}%` }}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
              {STAGES.map((s) => {
                const count = counts[s.key];
                return (
                  <div
                    key={s.key}
                    className={`flex flex-col items-center rounded px-2 py-1.5 text-center ${count > 0 ? s.color : "bg-muted/30 text-muted-foreground/40"}`}
                  >
                    <span className="text-base font-bold tabular-nums leading-none">{count}</span>
                    <span className="text-[9px] font-medium mt-0.5 leading-tight">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardFiltered({ allDepts, assignedDepartments, userRole, sodConflicts, lowConfidence, sodRulesCount, personasWithMapping, totalPersonas, overprovisioningAlerts }: Props) {
  const router = useRouter();

  const defaultValue = assignedDepartments && assignedDepartments.length === 1
    ? assignedDepartments[0]
    : "__all__";

  const [selected, setSelected] = useState(defaultValue);
  const [acceptingKey, setAcceptingKey] = useState<string | null>(null);
  const [justification, setJustification] = useState("");
  const [accepting, setAccepting] = useState(false);

  const canAcceptExceptions = ["admin", "system_admin", "approver"].includes(userRole);

  const allDeptNames = allDepts.map((d) => d.department).sort();

  const filteredDepts = useMemo(() => {
    let depts = allDepts;
    if (selected !== "__all__") {
      depts = allDepts.filter((d) => d.department === selected);
    }
    return depts.sort((a, b) => {
      const scoreA = a.approved > 0 ? 4 : a.sodClean > 0 ? 3 : a.mapped > 0 ? 2 : a.withPersona > 0 ? 1 : 0;
      const scoreB = b.approved > 0 ? 4 : b.sodClean > 0 ? 3 : b.mapped > 0 ? 2 : b.withPersona > 0 ? 1 : 0;
      return scoreB - scoreA || a.department.localeCompare(b.department);
    });
  }, [allDepts, selected]);

  const scopedTotals = useMemo(() => ({
    users: filteredDepts.reduce((s, d) => s + d.totalUsers, 0),
    persona: filteredDepts.reduce((s, d) => s + d.withPersona, 0),
    mapped: filteredDepts.reduce((s, d) => s + d.mapped, 0),
    sodRejected: filteredDepts.reduce((s, d) => s + d.sodRejected, 0),
    sodClean: filteredDepts.reduce((s, d) => s + d.sodClean, 0),
    approved: filteredDepts.reduce((s, d) => s + d.approved, 0),
  }), [filteredDepts]);

  const pendingAlerts = overprovisioningAlerts.filter(a => !a.exceptionStatus);

  async function handleAccept(alert: ProvisioningAlert) {
    if (!justification.trim()) return;
    setAccepting(true);
    try {
      const res = await fetch("/api/least-access/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappingId: alert.mappingId,
          targetRoleId: alert.targetRoleId,
          personaId: alert.personaId,
          justification: justification.trim(),
        }),
      });
      if (res.ok) {
        setAcceptingKey(null);
        setJustification("");
        router.refresh();
      }
    } finally {
      setAccepting(false);
    }
  }

  async function handleRevoke(alert: ProvisioningAlert) {
    if (!alert.exceptionId) return;
    await fetch("/api/least-access/exceptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exceptionId: alert.exceptionId }),
    });
    router.refresh();
  }

  const headerLabel = selected === "__all__"
    ? "All Departments — Role Mapping Progress"
    : `${selected} — Role Mapping Progress`;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-sm font-medium">{headerLabel}</CardTitle>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-[220px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Departments</SelectItem>
                {assignedDepartments && (
                  <SelectItem value="__assigned__" disabled className="text-xs text-muted-foreground font-medium">
                    — My Assigned —
                  </SelectItem>
                )}
                {allDeptNames.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                    {assignedDepartments?.includes(dept) ? " ★" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
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
              <p className="text-xs text-muted-foreground text-red-600">SOD Rejected</p>
              <p className="text-xl font-bold tabular-nums text-red-600">{scopedTotals.sodRejected}</p>
              <p className="text-xs text-muted-foreground">{scopedTotals.users > 0 ? Math.round((scopedTotals.sodRejected / scopedTotals.users) * 100) : 0}%</p>
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

          <DeptKanbanGrid depts={filteredDepts} />
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
          {pendingAlerts.length > 0 && (
            <div className="flex items-center justify-between rounded-md border border-orange-200 bg-orange-50/50 px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                Over-provisioned role assignments pending review
              </span>
              <span className="font-semibold tabular-nums text-orange-700">{pendingAlerts.length}</span>
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

      {/* Provisioning Alerts */}
      {overprovisioningAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Provisioning Alerts
              {pendingAlerts.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {pendingAlerts.length} pending review
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              These personas are mapped to roles with more permissions than their usage warrants.
              {canAcceptExceptions ? " Accept exceptions where the over-provisioning is intentional." : ""}
            </p>
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {overprovisioningAlerts.map(alert => {
                const key = `${alert.personaId}-${alert.targetRoleId}`;
                const isAccepting = acceptingKey === key;
                const isExcepted = alert.exceptionStatus === "accepted";

                return (
                  <div
                    key={key}
                    className={`rounded-md border px-3 py-2 ${isExcepted ? "border-emerald-200 bg-emerald-50/30" : "border-orange-200 bg-orange-50/40"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{alert.personaName}</span>
                        <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">→ {alert.roleName}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ${alert.excessPercent >= 60 ? "border-red-200 text-red-700" : "border-orange-200 text-orange-700"}`}
                        >
                          +{alert.excessPercent}% excess
                        </Badge>
                        <span className="text-[10px] text-muted-foreground shrink-0">{alert.userCount} user{alert.userCount !== 1 ? "s" : ""}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isExcepted ? (
                          <>
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">Excepted</Badge>
                            {canAcceptExceptions && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px] text-muted-foreground"
                                onClick={() => handleRevoke(alert)}
                              >
                                Revoke
                              </Button>
                            )}
                          </>
                        ) : canAcceptExceptions && !isAccepting ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px]"
                            onClick={() => { setAcceptingKey(key); setJustification(""); }}
                          >
                            Accept
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">{alert.roleName}</p>
                    {isAccepting && (
                      <div className="mt-2 space-y-1.5">
                        <Textarea
                          placeholder="Justification for accepting this exception..."
                          value={justification}
                          onChange={e => setJustification(e.target.value)}
                          rows={2}
                          className="text-xs resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-6 text-xs"
                            disabled={!justification.trim() || accepting}
                            onClick={() => handleAccept(alert)}
                          >
                            {accepting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={() => { setAcceptingKey(null); setJustification(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
