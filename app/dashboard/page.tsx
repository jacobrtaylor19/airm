import { getDashboardStats, getDepartmentMappingStatus, getSourceSystemStats } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { getUserScopeDepartments } from "@/lib/scope";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WorkflowStepper, type WorkflowStage } from "@/components/layout/workflow-stepper";
import { Upload, UserCircle, Route, ShieldAlert, Shield, CheckCircle, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardFiltered } from "./dashboard-filtered";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const user = requireAuth();
  const stats = getDashboardStats();
  const allDeptStatus = getDepartmentMappingStatus();
  const sourceSystemStats = getSourceSystemStats();

  const mappedPercent = stats.totalPersonas > 0
    ? Math.round((stats.personasWithMapping / stats.totalPersonas) * 100) : 0;
  const approvedPercent = stats.totalAssignments > 0
    ? Math.round((stats.approvedAssignments / stats.totalAssignments) * 100) : 0;

  // Determine assigned departments for mapper/approver via org hierarchy
  const scopeDepts = getUserScopeDepartments(user);
  const assignedDepartments = scopeDepts && scopeDepts.length > 0 ? scopeDepts : null;

  // Workflow stages
  const hasData = stats.totalUsers > 0 && stats.totalSourceRoles > 0;
  const hasPersonas = stats.usersWithPersona > 0;
  const hasMappings = stats.personasWithMapping > 0;
  const hasSODRules = stats.sodRulesCount > 0;

  const stages: WorkflowStage[] = [
    {
      label: "Upload", href: "/upload", icon: Upload,
      status: hasData ? "complete" : "not_started",
      detail: hasData ? `${stats.totalUsers} users, ${stats.totalSourceRoles} roles` : "Upload data",
    },
    {
      label: "Personas", href: "/personas", icon: UserCircle,
      status: hasPersonas ? (stats.usersWithPersona >= stats.totalUsers ? "complete" : "partial") : "not_started",
      detail: hasPersonas ? `${stats.usersWithPersona}/${stats.totalUsers} assigned` : "Generate personas",
    },
    {
      label: "Mapping", href: "/mapping", icon: Route,
      status: hasMappings ? (stats.personasWithMapping >= stats.totalPersonas ? "complete" : "active") : "not_started",
      detail: hasMappings ? `${stats.personasWithMapping}/${stats.totalPersonas} mapped` : "Map target roles",
    },
    {
      label: "SOD Analysis", href: "/sod", icon: ShieldAlert,
      status: hasSODRules ? (stats.complianceApproved > 0 ? "complete" : stats.sodConflictsBySeverity.length > 0 ? "partial" : "not_started") : "not_started",
      detail: hasSODRules ? `${stats.sodRulesCount} rules loaded` : "Upload SOD rules",
    },
    {
      label: "Approval", href: "/approvals", icon: CheckCircle,
      status: stats.approvedAssignments > 0 ? (stats.approvedAssignments >= stats.totalAssignments ? "complete" : "active") : "not_started",
      detail: stats.readyForApproval > 0 ? `${stats.readyForApproval} ready` : stats.approvedAssignments > 0 ? `${stats.approvedAssignments} approved` : "Pending",
    },
  ];

  return (
    <div className="space-y-6">
      <WorkflowStepper stages={stages} />

      {/* Global KPI Cards */}
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Project Role Mapping Progress</h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard title="Total Users" value={stats.totalUsers} subtitle={`${stats.totalSourceRoles} source roles`} />
        <KpiCard title="Personas Generated" value={stats.totalPersonas} subtitle={`${stats.totalGroups} consolidated groups`} />
        <KpiCard
          title="Persona Coverage"
          value={`${stats.usersWithPersona > 0 ? Math.round((stats.usersWithPersona / stats.totalUsers) * 100) : 0}%`}
          subtitle={`${stats.usersWithPersona}/${stats.totalUsers} users assigned`}
        />
        <KpiCard title="Mapped to Roles" value={`${mappedPercent}%`} subtitle={`${stats.personasWithMapping}/${stats.totalPersonas} personas`} />
        <KpiCard
          title="Approved"
          value={`${approvedPercent}%`}
          subtitle={stats.totalAssignments > 0 ? `${stats.approvedAssignments}/${stats.totalAssignments} assignments` : "No assignments yet"}
        />
      </div>

      {/* Existing Production Access Summary */}
      {stats.existingAccessCount > 0 && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="flex items-center gap-3 py-3">
            <Shield className="h-4 w-4 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800">
              <strong>{stats.existingAccessUserCount}</strong> user{stats.existingAccessUserCount !== 1 ? "s" : ""} with existing production access loaded ({stats.existingAccessCount} assignment{stats.existingAccessCount !== 1 ? "s" : ""} from previous waves). These are included in SOD analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Source Systems Summary */}
      {sourceSystemStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Database className="h-4 w-4" />
              Source Systems
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {sourceSystemStats.map((s) => (
                <div key={s.system} className="rounded-md border bg-background p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">{s.system}</Badge>
                  </div>
                  <p className="text-lg font-bold tabular-nums">{s.roleCount}</p>
                  <p className="text-xs text-muted-foreground">
                    role{s.roleCount !== 1 ? "s" : ""}
                    {s.userCount > 0 && <> &middot; {s.userCount} user{s.userCount !== 1 ? "s" : ""}</>}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtered Department View — interactive client component */}
      <DashboardFiltered
        allDepts={allDeptStatus}
        assignedDepartments={assignedDepartments}
        userRole={user.role}
        sodConflicts={stats.sodConflictsBySeverity}
        lowConfidence={stats.lowConfidence}
        sodRulesCount={stats.sodRulesCount}
        personasWithMapping={stats.personasWithMapping}
        totalPersonas={stats.totalPersonas}
      />
    </div>
  );
}
