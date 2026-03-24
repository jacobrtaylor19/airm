import { getDashboardStats, getDepartmentMappingStatus, getAssignedScope } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WorkflowStepper, type WorkflowStage } from "@/components/layout/workflow-stepper";
import { Upload, UserCircle, Route, ShieldAlert, CheckCircle } from "lucide-react";
import { DashboardFiltered } from "./dashboard-filtered";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const user = requireAuth();
  const stats = getDashboardStats();
  const allDeptStatus = getDepartmentMappingStatus();

  const mappedPercent = stats.totalPersonas > 0
    ? Math.round((stats.personasWithMapping / stats.totalPersonas) * 100) : 0;
  const approvedPercent = stats.totalAssignments > 0
    ? Math.round((stats.approvedAssignments / stats.totalAssignments) * 100) : 0;

  // Determine assigned departments for mapper/approver
  const assignmentType = user.role === "mapper" ? "mapper" : user.role === "approver" ? "approver" : null;
  let assignedDepartments: string[] | null = null;
  if (assignmentType) {
    const scope = getAssignedScope(user.id, assignmentType);
    if (scope.departments.length > 0) {
      assignedDepartments = scope.departments;
    }
  }

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
