"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  Loader2,
  Search,
  Users,
  UserCircle,
  Target,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Eye,
  Filter,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface ValidationData {
  generatedAt: string;
  summary: {
    totalUsers: number;
    totalPersonas: number;
    totalTargetRoles: number;
    totalAssignments: number;
    totalSodConflicts: number;
    usersWithPersona: number;
    usersWithoutPersona: number;
    pipelineCoverage: number;
  };
  personaDistribution: Array<{
    personaId: number;
    personaName: string;
    businessFunction: string;
    userCount: number;
    avgConfidence: number;
    minConfidence: number;
    maxConfidence: number;
  }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  confidenceBuckets: Array<{ bucket: string; count: number }>;
  edgeCases: {
    noPersona: number;
    personaButNoRoles: number;
    lowConfidence: number;
    highSodConflicts: number;
    manySourceRoles: number;
    manyTargetRoles: number;
  };
  personaRoleMappings: Array<{
    personaId: number;
    personaName: string;
    targetRoleId: number;
    targetRoleName: string;
    mappingReason: string;
    confidence: string;
    coveragePercent: number;
    excessPercent: number;
  }>;
  users: EnrichedUser[];
}

interface EnrichedUser {
  userId: number;
  sourceUserId: string;
  displayName: string;
  department: string | null;
  jobTitle: string | null;
  orgUnit: string | null;
  personaId: number | null;
  personaName: string | null;
  personaBusinessFunction: string | null;
  confidenceScore: number | null;
  aiReasoning: string | null;
  assignmentMethod: string | null;
  consolidatedGroupName: string | null;
  sourceRoleCount: number;
  targetRoles: Array<{
    targetRoleId: number;
    targetRoleName: string;
    targetRoleDomain: string | null;
    status: string;
    assignmentType: string;
    sodConflictCount: number;
  }>;
  targetRoleCount: number;
  sodConflictCount: number;
  hasPersona: boolean;
  hasTargetRoles: boolean;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    draft: { color: "bg-slate-100 text-slate-700", label: "Draft" },
    pending_review: { color: "bg-blue-100 text-blue-700", label: "Pending Review" },
    sod_rejected: { color: "bg-red-100 text-red-700", label: "SOD Rejected" },
    compliance_approved: { color: "bg-emerald-100 text-emerald-700", label: "Compliance Approved" },
    ready_for_approval: { color: "bg-amber-100 text-amber-700", label: "Ready for Approval" },
    approved: { color: "bg-green-100 text-green-800", label: "Approved" },
  };
  const s = map[status] ?? { color: "bg-gray-100 text-gray-700", label: status };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>{s.label}</span>;
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 80 ? "text-green-700 bg-green-50" : score >= 60 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{score.toFixed(0)}%</span>;
}

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600">{score.toFixed(0)}%</span>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`rounded-lg p-2 ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Pipeline Flow Visual
// ─────────────────────────────────────────────

function PipelineFlow({ summary }: { summary: ValidationData["summary"] }) {
  const steps = [
    { label: "Source Users", count: summary.totalUsers, icon: Users, color: "bg-slate-600" },
    { label: "Persona Assignment", count: summary.usersWithPersona, icon: UserCircle, color: "bg-indigo-600" },
    { label: "Role Mapping", count: summary.totalAssignments, icon: Target, color: "bg-teal-600" },
    { label: "SOD Analysis", count: summary.totalSodConflicts, icon: ShieldAlert, color: summary.totalSodConflicts > 0 ? "bg-amber-600" : "bg-green-600" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Attribution Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 flex-1">
              <div className="flex flex-col items-center text-center flex-1">
                <div className={`rounded-lg p-2.5 ${step.color} mb-2`}>
                  <step.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-xs font-medium">{step.label}</p>
                <p className="text-lg font-bold">{step.count.toLocaleString()}</p>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${summary.pipelineCoverage}%` }} />
          </div>
          <span className="text-sm font-semibold text-teal-700">{summary.pipelineCoverage}% coverage</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Persona Distribution Chart (bar chart via divs)
// ─────────────────────────────────────────────

function PersonaDistributionChart({ data, totalUsers, onSelect }: { data: ValidationData["personaDistribution"]; totalUsers: number; onSelect: (name: string) => void }) {
  const maxCount = Math.max(...data.map((d) => d.userCount), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Persona Distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 max-h-80 overflow-y-auto">
        {data.map((p) => {
          const pct = ((p.userCount / totalUsers) * 100).toFixed(1);
          const barPct = (p.userCount / maxCount) * 100;
          const barColor = p.avgConfidence >= 80 ? "bg-teal-500" : p.avgConfidence >= 60 ? "bg-amber-500" : "bg-red-500";

          return (
            <button
              key={p.personaId}
              onClick={() => onSelect(p.personaName)}
              className="w-full text-left group hover:bg-slate-50 rounded-md p-1.5 transition-colors"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-medium truncate max-w-[60%] group-hover:text-teal-700">{p.personaName}</span>
                <span className="text-xs text-muted-foreground">{p.userCount} users ({pct}%)</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${barPct}%` }} />
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Confidence Histogram
// ─────────────────────────────────────────────

function ConfidenceHistogram({ buckets }: { buckets: ValidationData["confidenceBuckets"] }) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
  const orderedBuckets = ["90-100", "80-89", "70-79", "60-69", "50-59", "Below 50"];
  const bucketMap: Record<string, number> = {};
  for (const b of buckets) { bucketMap[b.bucket] = b.count; }

  const colors: Record<string, string> = {
    "90-100": "bg-green-500",
    "80-89": "bg-green-400",
    "70-79": "bg-teal-400",
    "60-69": "bg-amber-400",
    "50-59": "bg-amber-500",
    "Below 50": "bg-red-500",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Confidence Score Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-32">
          {orderedBuckets.map((bucket) => {
            const cnt = bucketMap[bucket] ?? 0;
            const heightPct = maxCount > 0 ? (cnt / maxCount) * 100 : 0;
            return (
              <div key={bucket} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-slate-500">{cnt}</span>
                <div className="w-full rounded-t" style={{ height: `${Math.max(heightPct, 2)}%` }}>
                  <div className={`w-full h-full rounded-t ${colors[bucket] ?? "bg-slate-300"}`} />
                </div>
                <span className="text-[10px] text-muted-foreground">{bucket}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Status Breakdown
// ─────────────────────────────────────────────

function StatusBreakdown({ data }: { data: ValidationData["statusBreakdown"] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const colors: Record<string, string> = {
    draft: "bg-slate-400",
    pending_review: "bg-blue-400",
    sod_rejected: "bg-red-400",
    compliance_approved: "bg-emerald-400",
    ready_for_approval: "bg-amber-400",
    approved: "bg-green-500",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Assignment Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-4 w-full rounded-full overflow-hidden mb-3">
          {data.map((d) => (
            <div
              key={d.status}
              className={`${colors[d.status] ?? "bg-gray-300"}`}
              style={{ width: `${total > 0 ? (d.count / total) * 100 : 0}%` }}
              title={`${d.status}: ${d.count}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {data.map((d) => (
            <div key={d.status} className="flex items-center gap-2 text-xs">
              <div className={`h-2.5 w-2.5 rounded-full ${colors[d.status] ?? "bg-gray-300"}`} />
              <span className="text-muted-foreground">{d.status.replace(/_/g, " ")}</span>
              <span className="font-semibold ml-auto">{d.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// Edge Cases
// ─────────────────────────────────────────────

function EdgeCasePanel({ edgeCases, totalUsers, onFilter }: { edgeCases: ValidationData["edgeCases"]; totalUsers: number; onFilter: (filter: string) => void }) {
  const items = [
    { key: "noPersona", label: "No persona assigned", count: edgeCases.noPersona, icon: XCircle, severity: "critical" as const },
    { key: "personaButNoRoles", label: "Persona but no target roles", count: edgeCases.personaButNoRoles, icon: AlertTriangle, severity: "high" as const },
    { key: "lowConfidence", label: "Low confidence (<60%)", count: edgeCases.lowConfidence, icon: AlertTriangle, severity: "medium" as const },
    { key: "highSodConflicts", label: "3+ SOD conflicts", count: edgeCases.highSodConflicts, icon: ShieldAlert, severity: "high" as const },
    { key: "manySourceRoles", label: "10+ source roles (complex)", count: edgeCases.manySourceRoles, icon: Zap, severity: "info" as const },
    { key: "manyTargetRoles", label: "8+ target roles assigned", count: edgeCases.manyTargetRoles, icon: Zap, severity: "info" as const },
  ];

  const severityColors = {
    critical: "border-red-200 bg-red-50",
    high: "border-amber-200 bg-amber-50",
    medium: "border-yellow-200 bg-yellow-50",
    info: "border-blue-200 bg-blue-50",
  };

  const iconColors = {
    critical: "text-red-500",
    high: "text-amber-500",
    medium: "text-yellow-600",
    info: "text-blue-500",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Edge Cases & Anomalies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onFilter(item.key)}
            className={`w-full flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:shadow-sm ${severityColors[item.severity]}`}
          >
            <item.icon className={`h-4 w-4 flex-shrink-0 ${iconColors[item.severity]}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{item.label}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold">{item.count}</p>
              <p className="text-[10px] text-muted-foreground">
                {totalUsers > 0 ? ((item.count / totalUsers) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────
// User Detail Modal
// ─────────────────────────────────────────────

function UserDetailModal({ user, personaRoleMappings, onClose }: { user: EnrichedUser; personaRoleMappings: ValidationData["personaRoleMappings"]; onClose: () => void }) {
  const mappingsForPersona = user.personaId
    ? personaRoleMappings.filter((m) => m.personaId === user.personaId)
    : [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-teal-500" />
            Attribution Chain: {user.displayName}
          </DialogTitle>
        </DialogHeader>

        {/* Pipeline visual for this user */}
        <div className="flex items-center gap-2 py-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2">
            <Users className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-medium">Source User</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300" />
          <div className={`flex items-center gap-1 rounded-lg px-3 py-2 ${user.hasPersona ? "bg-indigo-100" : "bg-red-100"}`}>
            <UserCircle className={`h-4 w-4 ${user.hasPersona ? "text-indigo-500" : "text-red-500"}`} />
            <span className="text-xs font-medium">{user.hasPersona ? "Persona Assigned" : "No Persona"}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300" />
          <div className={`flex items-center gap-1 rounded-lg px-3 py-2 ${user.hasTargetRoles ? "bg-teal-100" : "bg-red-100"}`}>
            <Target className={`h-4 w-4 ${user.hasTargetRoles ? "text-teal-500" : "text-red-500"}`} />
            <span className="text-xs font-medium">{user.targetRoleCount} Role(s)</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300" />
          <div className={`flex items-center gap-1 rounded-lg px-3 py-2 ${user.sodConflictCount === 0 ? "bg-green-100" : "bg-amber-100"}`}>
            <ShieldAlert className={`h-4 w-4 ${user.sodConflictCount === 0 ? "text-green-500" : "text-amber-500"}`} />
            <span className="text-xs font-medium">{user.sodConflictCount} SOD</span>
          </div>
        </div>

        {/* Source attributes */}
        <div className="rounded-lg border p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Source Attributes</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div><span className="text-muted-foreground">User ID:</span> <span className="font-medium">{user.sourceUserId}</span></div>
            <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{user.department ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Job Title:</span> <span className="font-medium">{user.jobTitle ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Org Unit:</span> <span className="font-medium">{user.orgUnit ?? "—"}</span></div>
            <div><span className="text-muted-foreground">Source Roles:</span> <span className="font-medium">{user.sourceRoleCount}</span></div>
          </div>
        </div>

        {/* Persona assignment */}
        <div className={`rounded-lg border p-3 ${user.hasPersona ? "border-indigo-200 bg-indigo-50/50" : "border-red-200 bg-red-50/50"}`}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Persona Assignment</h4>
          {user.hasPersona ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{user.personaName}</span>
                <ConfidenceBadge score={user.confidenceScore} />
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Business Function:</span> {user.personaBusinessFunction ?? "—"}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Security Group:</span> {user.consolidatedGroupName ?? "—"}
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Method:</span> {user.assignmentMethod ?? "—"}
              </div>
              {user.aiReasoning && (
                <div className="mt-2 rounded bg-white/80 border p-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">AI Reasoning</p>
                  <p className="text-xs leading-relaxed">{user.aiReasoning}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-red-600 font-medium">No persona was assigned to this user.</p>
          )}
        </div>

        {/* Persona → Role mapping (what the persona maps to) */}
        {mappingsForPersona.length > 0 && (
          <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Persona → Role Mapping (what "{user.personaName}" maps to)
            </h4>
            <div className="space-y-1.5">
              {mappingsForPersona.map((m) => (
                <div key={m.targetRoleId} className="flex items-center justify-between rounded bg-white/80 border px-2.5 py-1.5">
                  <div>
                    <span className="text-xs font-medium">{m.targetRoleName}</span>
                    {m.mappingReason && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.mappingReason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {m.coveragePercent != null && <span className="text-[10px] text-muted-foreground">{m.coveragePercent}% coverage</span>}
                    <Badge variant="outline" className="text-[10px]">{m.confidence}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target role assignments (what the user actually got) */}
        <div className="rounded-lg border p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Target Role Assignments ({user.targetRoleCount})
          </h4>
          {user.targetRoles.length > 0 ? (
            <div className="space-y-1.5">
              {user.targetRoles.map((r) => (
                <div key={r.targetRoleId} className="flex items-center justify-between rounded bg-slate-50 border px-2.5 py-1.5">
                  <div>
                    <span className="text-xs font-medium">{r.targetRoleName}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{r.targetRoleDomain ?? ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.sodConflictCount > 0 && (
                      <Badge variant="destructive" className="text-[10px]">{r.sodConflictCount} SOD</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No target roles assigned.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// User Table
// ─────────────────────────────────────────────

function UserTable({ users, personaRoleMappings }: { users: EnrichedUser[]; personaRoleMappings: ValidationData["personaRoleMappings"] }) {
  const [selectedUser, setSelectedUser] = useState<EnrichedUser | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const pageCount = Math.ceil(users.length / PAGE_SIZE);
  const pagedUsers = users.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <>
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          personaRoleMappings={personaRoleMappings}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Department</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Persona</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Confidence</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Src Roles</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Tgt Roles</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">SOD</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Flags</th>
                <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((u) => {
                const flags: string[] = [];
                if (!u.hasPersona) flags.push("NO_PERSONA");
                if (u.hasPersona && !u.hasTargetRoles) flags.push("NO_ROLES");
                if (u.confidenceScore !== null && u.confidenceScore < 60) flags.push("LOW_CONF");
                if (u.sodConflictCount >= 3) flags.push("HIGH_SOD");

                return (
                  <tr
                    key={u.userId}
                    className="border-b hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedUser(u)}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-xs">{u.displayName}</div>
                      <div className="text-[10px] text-muted-foreground">{u.sourceUserId}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{u.department ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{u.personaName ?? <span className="text-red-500 font-medium">None</span>}</td>
                    <td className="px-3 py-2 text-center"><ConfidenceBadge score={u.confidenceScore} /></td>
                    <td className="px-3 py-2 text-center text-xs">{u.sourceRoleCount}</td>
                    <td className="px-3 py-2 text-center text-xs">{u.targetRoleCount}</td>
                    <td className="px-3 py-2 text-center">
                      {u.sodConflictCount > 0 ? (
                        <Badge variant="destructive" className="text-[10px]">{u.sodConflictCount}</Badge>
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {flags.length > 0 ? (
                        <div className="flex gap-0.5 justify-center flex-wrap">
                          {flags.map((f) => (
                            <span key={f} className="text-[9px] px-1 py-0.5 rounded bg-red-100 text-red-700 font-medium">{f}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-green-100 text-green-700 font-medium">CLEAN</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Eye className="h-3.5 w-3.5 text-slate-400 mx-auto" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t bg-slate-50">
            <span className="text-xs text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, users.length)} of {users.length}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────

export function ValidationDashboard() {
  const [data, setData] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterPersona, setFilterPersona] = useState<string>("all");
  const [filterEdgeCase, setFilterEdgeCase] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "personas">("overview");

  useEffect(() => {
    fetch("/api/admin/validation")
      .then((r) => r.json())
      .then(setData)
      .catch(() => toast.error("Failed to load validation data"))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    let users = data.users;

    // Search
    if (search) {
      const q = search.toLowerCase();
      users = users.filter((u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.sourceUserId.toLowerCase().includes(q) ||
        (u.personaName ?? "").toLowerCase().includes(q) ||
        (u.department ?? "").toLowerCase().includes(q)
      );
    }

    // Persona filter
    if (filterPersona !== "all") {
      users = users.filter((u) => u.personaName === filterPersona);
    }

    // Edge case filter
    if (filterEdgeCase !== "all") {
      switch (filterEdgeCase) {
        case "noPersona": users = users.filter((u) => !u.hasPersona); break;
        case "personaButNoRoles": users = users.filter((u) => u.hasPersona && !u.hasTargetRoles); break;
        case "lowConfidence": users = users.filter((u) => u.confidenceScore !== null && u.confidenceScore < 60); break;
        case "highSodConflicts": users = users.filter((u) => u.sodConflictCount >= 3); break;
        case "manySourceRoles": users = users.filter((u) => u.sourceRoleCount >= 10); break;
        case "manyTargetRoles": users = users.filter((u) => u.targetRoleCount >= 8); break;
      }
    }

    return users;
  }, [data, search, filterPersona, filterEdgeCase]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/validation/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `provisum-validation-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Validation report exported");
    } catch {
      toast.error("Failed to export validation report");
    } finally {
      setExporting(false);
    }
  };

  const handleFilterFromEdgeCase = (key: string) => {
    setFilterEdgeCase(key);
    setActiveTab("users");
  };

  const handleFilterFromPersona = (name: string) => {
    setFilterPersona(name);
    setActiveTab("users");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading validation data...</span>
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground py-10">No validation data available. Run the persona generation and role mapping pipeline first.</p>;
  }

  const personaNames = Array.from(new Set(data.users.filter((u) => u.personaName).map((u) => u.personaName!))).sort();

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["overview", "users", "personas"] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "ghost"}
              size="sm"
              className="h-8 text-xs capitalize"
              onClick={() => setActiveTab(tab)}
            >
              {tab === "overview" && <BarChart3 className="h-3.5 w-3.5 mr-1" />}
              {tab === "users" && <Users className="h-3.5 w-3.5 mr-1" />}
              {tab === "personas" && <UserCircle className="h-3.5 w-3.5 mr-1" />}
              {tab}
            </Button>
          ))}
        </div>
        <Button onClick={handleExport} disabled={exporting} size="sm" className="h-8 bg-teal-600 hover:bg-teal-700">
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
          Export Validation Report
        </Button>
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === "overview" && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-5 gap-3">
            <StatCard label="Source Users" value={data.summary.totalUsers} icon={Users} color="bg-slate-600" />
            <StatCard label="Personas" value={data.summary.totalPersonas} icon={UserCircle} color="bg-indigo-600" />
            <StatCard label="Target Roles" value={data.summary.totalTargetRoles} icon={Target} color="bg-teal-600" />
            <StatCard label="Assignments" value={data.summary.totalAssignments} icon={CheckCircle2} color="bg-green-600" />
            <StatCard label="SOD Conflicts" value={data.summary.totalSodConflicts} icon={ShieldAlert} color={data.summary.totalSodConflicts > 0 ? "bg-amber-600" : "bg-green-600"} />
          </div>

          {/* Pipeline flow */}
          <PipelineFlow summary={data.summary} />

          {/* Charts row */}
          <div className="grid grid-cols-3 gap-3">
            <PersonaDistributionChart data={data.personaDistribution} totalUsers={data.summary.totalUsers} onSelect={handleFilterFromPersona} />
            <ConfidenceHistogram buckets={data.confidenceBuckets} />
            <StatusBreakdown data={data.statusBreakdown} />
          </div>

          {/* Edge cases */}
          <EdgeCasePanel edgeCases={data.edgeCases} totalUsers={data.summary.totalUsers} onFilter={handleFilterFromEdgeCase} />
        </>
      )}

      {/* ─── USERS TAB ─── */}
      {activeTab === "users" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search users, IDs, personas, departments..."
                className="h-8 text-xs pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterPersona} onValueChange={setFilterPersona}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="All Personas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Personas</SelectItem>
                {personaNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEdgeCase} onValueChange={setFilterEdgeCase}>
              <SelectTrigger className="w-52 h-8 text-xs">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="noPersona">No Persona</SelectItem>
                <SelectItem value="personaButNoRoles">Persona, No Roles</SelectItem>
                <SelectItem value="lowConfidence">Low Confidence</SelectItem>
                <SelectItem value="highSodConflicts">High SOD Conflicts</SelectItem>
                <SelectItem value="manySourceRoles">Complex Users (10+ src)</SelectItem>
                <SelectItem value="manyTargetRoles">Many Target Roles (8+)</SelectItem>
              </SelectContent>
            </Select>
            {(filterPersona !== "all" || filterEdgeCase !== "all" || search) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setFilterPersona("all"); setFilterEdgeCase("all"); setSearch(""); }}
              >
                Clear Filters
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} — click any row to view full attribution chain</p>

          <UserTable users={filteredUsers} personaRoleMappings={data.personaRoleMappings} />
        </>
      )}

      {/* ─── PERSONAS TAB ─── */}
      {activeTab === "personas" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Persona → Target Role mapping detail. Click a persona to filter the Users tab.</p>
          {data.personaDistribution.map((p) => {
            const mappings = data.personaRoleMappings.filter((m) => m.personaId === p.personaId);
            return (
              <Card key={p.personaId}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <button
                        onClick={() => handleFilterFromPersona(p.personaName)}
                        className="text-sm font-semibold hover:text-teal-700 transition-colors"
                      >
                        {p.personaName}
                      </button>
                      <p className="text-xs text-muted-foreground">{p.businessFunction}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold">{p.userCount} users</p>
                        <p className="text-[10px] text-muted-foreground">
                          {((p.userCount / data.summary.totalUsers) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                      <ConfidenceBar score={p.avgConfidence} />
                    </div>
                  </div>

                  {mappings.length > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                        Mapped Target Roles ({mappings.length})
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {mappings.map((m) => (
                          <div key={m.targetRoleId} className="flex items-center justify-between rounded bg-slate-50 border px-2.5 py-1.5">
                            <span className="text-xs font-medium truncate">{m.targetRoleName}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {m.coveragePercent != null && (
                                <span className="text-[10px] text-muted-foreground">{m.coveragePercent}%</span>
                              )}
                              <Badge variant="outline" className="text-[10px]">{m.confidence}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-3 border-t">
        <p className="text-[10px] text-muted-foreground">
          Provisum Pipeline Validation — Generated {new Date(data.generatedAt).toLocaleString()} — {data.summary.totalUsers} users, {data.summary.totalPersonas} personas, {data.summary.totalAssignments} assignments
        </p>
      </div>
    </div>
  );
}
