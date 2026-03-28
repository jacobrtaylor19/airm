import { getDashboardStats, getDepartmentMappingStatus, getSourceSystemStats, getLeastAccessAnalysis, getPersonaIdsForUsers, getAggregateRiskAnalysis } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { getUserScopeDepartments, getUserScope } from "@/lib/scope";
import { getSetting } from "@/lib/settings";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WorkflowStepper, type WorkflowStage } from "@/components/layout/workflow-stepper";
import { Upload, UserCircle, Route, ShieldAlert, Shield, CheckCircle, Database, Info, AlertTriangle, CheckCircle2, Zap, TrendingUp, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardFiltered } from "./dashboard-filtered";
import { generateStrapline } from "@/lib/strapline";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { inArray, count, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function DashboardPage() {
  const user = await requireAuth();

  try {
    return await renderDashboard(user);
  } catch (err) {
    console.error("[dashboard] Server-side error:", err);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 max-w-md text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
          <h2 className="text-lg font-semibold">Dashboard failed to load</h2>
          <p className="text-sm text-muted-foreground">
            An error occurred while loading dashboard data. This is usually transient — please try again.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </a>
        </div>
      </div>
    );
  }
}

async function renderDashboard(user: Awaited<ReturnType<typeof requireAuth>>) {
  // Run all independent data fetches in parallel
  const [stats, allDeptStatus, sourceSystemStats, scopeDepts] = await Promise.all([
    getDashboardStats(),
    getDepartmentMappingStatus(),
    getSourceSystemStats(),
    getUserScopeDepartments(user),
  ]);

  const mappedPercent = stats.totalPersonas > 0
    ? Math.round((stats.personasWithMapping / stats.totalPersonas) * 100) : 0;
  const approvedPercent = stats.totalAssignments > 0
    ? Math.round((stats.approvedAssignments / stats.totalAssignments) * 100) : 0;

  const assignedDepartments = scopeDepts && scopeDepts.length > 0 ? scopeDepts : null;

  // Single getUserScope call for all scoped features
  const needsScopeStats = ["mapper", "approver", "coordinator"].includes(user.role);
  const scopedUserIds = await getUserScope(user); // null for admins (unrestricted)

  // Fetch threshold first (single-row lookup, fast), then run all heavy queries in parallel
  const overprovisioningThreshold = parseInt(await getSetting("least_access_threshold") ?? "30", 10);

  const [riskAnalysis, scopedStatsData, overprovisioningAlertsRaw] = await Promise.all([
    getAggregateRiskAnalysis(scopedUserIds),
    // Scoped stats for strapline
    (needsScopeStats && scopedUserIds !== null && scopedUserIds.length > 0)
      ? (async () => {
          const depts = scopeDepts ?? [];
          const [scopedPersonaRows, pendingApprovalsResult] = await Promise.all([
            db.select({ personaId: schema.userPersonaAssignments.personaId })
              .from(schema.userPersonaAssignments)
              .where(inArray(schema.userPersonaAssignments.userId, scopedUserIds!)),
            db.select({ count: count() })
              .from(schema.userTargetRoleAssignments)
              .where(inArray(schema.userTargetRoleAssignments.userId, scopedUserIds!)),
          ]);
          const scopedPersonaIds = Array.from(new Set(scopedPersonaRows.map(r => r.personaId).filter((id): id is number => id !== null)));
          const mappedPersonaCount = scopedPersonaIds.length > 0
            ? Number((await db.select({ count: sql<number>`count(distinct ${schema.personaTargetRoleMappings.personaId})` })
                .from(schema.personaTargetRoleMappings)
                .where(inArray(schema.personaTargetRoleMappings.personaId, scopedPersonaIds)))?.[0]?.count ?? 0)
            : 0;
          const pendingApprovals = pendingApprovalsResult?.[0]?.count ?? 0;
          return {
            deptCount: depts.length,
            userCount: scopedUserIds!.length,
            mappedPersonaCount,
            totalPersonaCount: scopedPersonaIds.length,
            pendingApprovals,
          };
        })()
      : Promise.resolve(null),
    // Overprovisioning alerts
    getLeastAccessAnalysis(overprovisioningThreshold),
  ]);

  const scopedStats = scopedStatsData;

  const strapline = generateStrapline(stats, user.role, scopedStats, user.displayName);

  // Filter provisioning alerts by threshold and scope
  let overprovisioningAlerts = overprovisioningAlertsRaw;
  if (needsScopeStats && scopedUserIds !== null && scopedUserIds.length > 0) {
    const scopedPersonaIds = new Set(await getPersonaIdsForUsers(scopedUserIds));
    overprovisioningAlerts = overprovisioningAlerts.filter(r => scopedPersonaIds.has(r.personaId));
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
      detail: hasMappings
        ? (stats.draftAssignments > 0
          ? `${stats.draftAssignments} draft, ${stats.pendingReview} pending review`
          : `${stats.personasWithMapping}/${stats.totalPersonas} mapped`)
        : "Map target roles",
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

  const straplineIcon = strapline.tone === "positive"
    ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
    : strapline.tone === "action"
    ? <Zap className="h-4 w-4 text-orange-500 shrink-0" />
    : strapline.tone === "warning"
    ? <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
    : <Info className="h-4 w-4 text-blue-500 shrink-0" />;

  const straplineBg = strapline.tone === "positive"
    ? "border-emerald-200 bg-emerald-50/50"
    : strapline.tone === "action"
    ? "border-orange-200 bg-orange-50/50"
    : strapline.tone === "warning"
    ? "border-yellow-200 bg-yellow-50/50"
    : "border-blue-200 bg-blue-50/30";

  return (
    <div className="space-y-6">
      <WorkflowStepper stages={stages} />

      {/* Status Strapline */}
      <div className={`rounded-lg border px-4 py-3 ${straplineBg}`}>
        <div className="flex items-start gap-2.5">
          {straplineIcon}
          <div className="text-sm leading-relaxed">
            <span className="text-foreground">{strapline.project}</span>
            {strapline.area && (
              <>
                <span className="mx-2 text-muted-foreground/40">·</span>
                <span className="text-muted-foreground italic">{strapline.area}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Global KPI Cards */}
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Project Role Mapping Progress</h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard title="Total Users" value={stats.totalUsers} subtitle={needsScopeStats ? `${stats.totalSourceRoles} source roles (project-wide)` : `${stats.totalSourceRoles} source roles`} />
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

      {/* Risk Quantification Summary */}
      {riskAnalysis.totalUsersAnalyzed > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk Quantification</h3>
            <Link href="/risk-analysis" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              View full analysis &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className={riskAnalysis.businessContinuity.usersAtRisk > 20 ? "border-red-200 bg-red-50/30" : riskAnalysis.businessContinuity.usersAtRisk > 5 ? "border-yellow-200 bg-yellow-50/30" : ""}>
              <CardContent className="flex items-center gap-3 py-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Business Continuity</p>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{riskAnalysis.businessContinuity.usersAtRisk}</strong> users below 90% coverage &middot; {riskAnalysis.businessContinuity.avgCoverage}% avg
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className={riskAnalysis.adoption.usersWithNewAccess > 30 ? "border-red-200 bg-red-50/30" : riskAnalysis.adoption.usersWithNewAccess > 10 ? "border-yellow-200 bg-yellow-50/30" : ""}>
              <CardContent className="flex items-center gap-3 py-3">
                <TrendingUp className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Adoption Risk</p>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{riskAnalysis.adoption.usersWithNewAccess}</strong> users with &gt;10 new perms &middot; {riskAnalysis.adoption.totalNewPerms} total
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className={riskAnalysis.incorrectAccess.flaggedUsers > 10 ? "border-red-200 bg-red-50/30" : riskAnalysis.incorrectAccess.flaggedUsers > 3 ? "border-yellow-200 bg-yellow-50/30" : ""}>
              <CardContent className="flex items-center gap-3 py-3">
                <Shield className="h-5 w-5 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Incorrect Access</p>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{riskAnalysis.incorrectAccess.flaggedUsers}</strong> flagged users (gaps + SOD conflicts)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
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
        overprovisioningAlerts={overprovisioningAlerts}
      />

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
    </div>
  );
}
