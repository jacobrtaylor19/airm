import { getDashboardStats } from "@/lib/queries";
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

  // Build department progress data
  const deptObj: Record<string, { total: number; withPersona: number }> = {};
  for (const d of stats.departmentStats) {
    const key = d.department || "Unknown";
    deptObj[key] = { total: d.count, withPersona: 0 };
  }
  for (const d of stats.deptPersonaCounts) {
    const key = d.department || "Unknown";
    if (deptObj[key]) deptObj[key].withPersona = d.count;
  }
  const departments = Object.entries(deptObj)
    .map(([name, data]) => ({
      name,
      total: data.total,
      withPersona: data.withPersona,
      percent: Math.round((data.withPersona / data.total) * 100),
    }))
    .sort((a, b) => b.percent - a.percent);

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
        {/* Department Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Progress by Department</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {departments.map((dept) => (
              <div key={dept.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{dept.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {dept.withPersona}/{dept.total} ({dept.percent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${dept.percent}%` }}
                  />
                </div>
              </div>
            ))}
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
