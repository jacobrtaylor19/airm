import { getDashboardStats, getDepartmentMappingStatus } from "@/lib/queries";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WorkflowStepper, type WorkflowStage } from "@/components/layout/workflow-stepper";
import { Upload, UserCircle, Route, ShieldAlert, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const stats = getDashboardStats();

  const mappedPercent =
    stats.totalPersonas > 0
      ? Math.round((stats.personasWithMapping / stats.totalPersonas) * 100)
      : 0;
  const approvedPercent =
    stats.totalAssignments > 0
      ? Math.round((stats.approvedAssignments / stats.totalAssignments) * 100)
      : stats.totalUsers > 0
      ? 0
      : 0;

  // Compute workflow stages
  const hasData = stats.totalUsers > 0 && stats.totalSourceRoles > 0;
  const hasPersonas = stats.usersWithPersona > 0;
  const hasMappings = stats.personasWithMapping > 0;
  const hasSODRules = stats.sodRulesCount > 0;

  const stages: WorkflowStage[] = [
    {
      label: "Upload",
      href: "/upload",
      icon: Upload,
      status: hasData ? "complete" : "not_started",
      detail: hasData
        ? `${stats.totalUsers} users, ${stats.totalSourceRoles} roles`
        : "Upload data to begin",
    },
    {
      label: "Personas",
      href: "/personas",
      icon: UserCircle,
      status: hasPersonas
        ? stats.usersWithPersona >= stats.totalUsers
          ? "complete"
          : "partial"
        : "not_started",
      detail: hasPersonas
        ? `${stats.usersWithPersona}/${stats.totalUsers} assigned`
        : "Generate personas",
    },
    {
      label: "Mapping",
      href: "/mapping",
      icon: Route,
      status: hasMappings
        ? stats.personasWithMapping >= stats.totalPersonas
          ? "complete"
          : "active"
        : "not_started",
      detail: hasMappings
        ? `${stats.personasWithMapping}/${stats.totalPersonas} personas mapped`
        : "Map target roles",
    },
    {
      label: "SOD Analysis",
      href: "/sod",
      icon: ShieldAlert,
      status: hasSODRules
        ? stats.sodConflictsBySeverity.length > 0
          ? "partial"
          : stats.complianceApproved > 0
          ? "complete"
          : "not_started"
        : "not_started",
      detail: hasSODRules
        ? `${stats.sodRulesCount} rules loaded`
        : "Upload SOD rules",
    },
    {
      label: "Approval",
      href: "/approvals",
      icon: CheckCircle,
      status:
        stats.approvedAssignments > 0
          ? stats.approvedAssignments >= stats.totalAssignments
            ? "complete"
            : "active"
          : "not_started",
      detail:
        stats.readyForApproval > 0
          ? `${stats.readyForApproval} ready`
          : stats.approvedAssignments > 0
          ? `${stats.approvedAssignments} approved`
          : "Pending",
    },
  ];

  const deptStatus = getDepartmentMappingStatus()
    .sort((a, b) => {
      // Sort by furthest stage reached (approved > sodClean > mapped > withPersona)
      const scoreA = a.approved > 0 ? 4 : a.sodClean > 0 ? 3 : a.mapped > 0 ? 2 : a.withPersona > 0 ? 1 : 0;
      const scoreB = b.approved > 0 ? 4 : b.sodClean > 0 ? 3 : b.mapped > 0 ? 2 : b.withPersona > 0 ? 1 : 0;
      return scoreB - scoreA || a.department.localeCompare(b.department);
    });

  return (
    <div className="space-y-6">
      <WorkflowStepper stages={stages} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard
          title="Total Users"
          value={stats.totalUsers}
          subtitle={`${stats.totalSourceRoles} source roles`}
        />
        <KpiCard
          title="Personas Generated"
          value={stats.totalPersonas}
          subtitle={`${stats.totalGroups} consolidated groups`}
        />
        <KpiCard
          title="Persona Coverage"
          value={`${stats.usersWithPersona > 0 ? Math.round((stats.usersWithPersona / stats.totalUsers) * 100) : 0}%`}
          subtitle={`${stats.usersWithPersona}/${stats.totalUsers} users assigned`}
        />
        <KpiCard
          title="Mapped to Roles"
          value={`${mappedPercent}%`}
          subtitle={`${stats.personasWithMapping}/${stats.totalPersonas} personas`}
        />
        <KpiCard
          title="Approved"
          value={`${approvedPercent}%`}
          subtitle={
            stats.totalAssignments > 0
              ? `${stats.approvedAssignments}/${stats.totalAssignments} assignments`
              : "No assignments yet"
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Department Mapping Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Mapping Status by Department</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deptStatus.map((dept) => (
              <div key={dept.department} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{dept.department}</span>
                  <span className="text-xs text-muted-foreground">{dept.totalUsers} users</span>
                </div>
                <div className="flex h-2 rounded-full bg-muted overflow-hidden">
                  {dept.approved > 0 && (
                    <div
                      className="h-2 bg-emerald-500 transition-all"
                      style={{ width: `${(dept.approved / dept.totalUsers) * 100}%` }}
                      title={`${dept.approved} approved`}
                    />
                  )}
                  {dept.sodClean - dept.approved > 0 && (
                    <div
                      className="h-2 bg-blue-500 transition-all"
                      style={{ width: `${((dept.sodClean - dept.approved) / dept.totalUsers) * 100}%` }}
                      title={`${dept.sodClean - dept.approved} SOD clean`}
                    />
                  )}
                  {dept.mapped - dept.sodClean > 0 && (
                    <div
                      className="h-2 bg-yellow-500 transition-all"
                      style={{ width: `${((dept.mapped - dept.sodClean) / dept.totalUsers) * 100}%` }}
                      title={`${dept.mapped - dept.sodClean} mapped (pending SOD)`}
                    />
                  )}
                  {dept.withPersona - dept.mapped > 0 && (
                    <div
                      className="h-2 bg-zinc-400 transition-all"
                      style={{ width: `${((dept.withPersona - dept.mapped) / dept.totalUsers) * 100}%` }}
                      title={`${dept.withPersona - dept.mapped} persona assigned (unmapped)`}
                    />
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
            <div className="flex gap-4 text-xs pt-2 border-t">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> SOD Clean</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Mapped</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-400" /> Persona Only</span>
            </div>
          </CardContent>
        </Card>

        {/* Attention Required */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Attention Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.sodConflictsBySeverity.length > 0 ? (
              stats.sodConflictsBySeverity.map((s) => (
                <div
                  key={s.severity}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="capitalize">{s.severity} SOD conflicts</span>
                  <span className="font-semibold tabular-nums">{s.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No SOD conflicts detected yet</p>
            )}

            {stats.lowConfidence > 0 && (
              <div className="flex items-center justify-between rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm">
                <span>Low confidence assignments (&lt;65%)</span>
                <span className="font-semibold tabular-nums">{stats.lowConfidence}</span>
              </div>
            )}

            {stats.totalTargetRoles === 0 && (
              <div className="flex items-center justify-between rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm">
                <span>Target roles not yet uploaded</span>
              </div>
            )}

            {stats.totalPersonas > 0 && stats.personasWithMapping === 0 && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span>No personas mapped to target roles yet</span>
              </div>
            )}

            {stats.sodRulesCount === 0 && (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm text-muted-foreground">
                <span>SOD ruleset not uploaded — analysis will be skipped</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SOD Risk Summary */}
      {stats.sodConflictsBySeverity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">SOD Risk Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {["critical", "high", "medium", "low"].map((sev) => {
                const found = stats.sodConflictsBySeverity.find((s) => s.severity === sev);
                return (
                  <div key={sev} className="text-center">
                    <div className="text-2xl font-bold tabular-nums">{found?.count ?? 0}</div>
                    <div className="text-xs capitalize text-muted-foreground">{sev}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
