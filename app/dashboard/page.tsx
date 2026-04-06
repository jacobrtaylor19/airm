import { getDashboardStats, getDepartmentMappingStatus, getSourceSystemStats, getLeastAccessAnalysis, getPersonaIdsForUsers, getAggregateRiskAnalysis, getRecentActivity } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { getUserScopeDepartments, getUserScope } from "@/lib/scope";
import { getSetting } from "@/lib/settings";
import { getEffectiveReleaseIds, getUserIdsForReleases } from "@/lib/release-context";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WorkflowStepper, type WorkflowStage } from "@/components/layout/workflow-stepper";
import { Upload, UserCircle, Route, ShieldAlert, Shield, CheckCircle, Info, AlertTriangle, CheckCircle2, Zap, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardFiltered } from "./dashboard-filtered";
import { DashboardChat } from "@/components/chat/dashboard-chat";
import { StatusSlideButton } from "@/components/dashboard/status-slide-button";
import { generateStrapline } from "@/lib/strapline";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { inArray, count, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatAction(action: string, entityType: string): string {
  const clean = action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  if (entityType === "persona" && action.includes("generate")) return "Generated personas";
  if (entityType === "mapping" && action.includes("create")) return "Created role mapping";
  if (entityType === "mapping" && action.includes("approve")) return "Approved mappings";
  if (entityType === "sod" && action.includes("resolve")) return "Resolved SOD conflict";
  if (entityType === "assignment" && action.includes("submit")) return "Submitted for review";
  if (action.includes("upload")) return `Uploaded ${entityType}`;
  return clean;
}

function getInitials(email: string | null): string {
  if (!email) return "SY";
  const name = email.split("@")[0].replace(/[._-]/g, " ");
  return name.split(" ").map(n => n[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "??";
}

function getRiskSeverity(value: number, thresholds: [number, number]): { label: string; classes: string } {
  if (value > thresholds[1]) return { label: "High", classes: "text-red-600 bg-red-50 border-red-200" };
  if (value > thresholds[0]) return { label: "Medium", classes: "text-amber-600 bg-amber-50 border-amber-200" };
  return { label: "Low", classes: "text-emerald-600 bg-emerald-50 border-emerald-200" };
}

export default async function DashboardPage() {
  const user = await requireAuth();

  try {
    return await renderDashboard(user);
  } catch (err: unknown) {
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
            className="inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
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
  const orgId = getOrgId(user);

  // Get release filter from the release selector cookie
  const releaseIds = await getEffectiveReleaseIds(user.id, user.role);
  const releaseUserIds = await getUserIdsForReleases(releaseIds);

  const [stats, allDeptStatus, sourceSystemStats, scopeDepts, recentActivity] = await Promise.all([
    getDashboardStats(orgId, releaseUserIds),
    getDepartmentMappingStatus(orgId, releaseUserIds),
    getSourceSystemStats(orgId),
    getUserScopeDepartments(user),
    getRecentActivity(orgId, 8),
  ]);

  const mappedPercent = stats.totalPersonas > 0
    ? Math.round((stats.personasWithMapping / stats.totalPersonas) * 100) : 0;
  const approvedPercent = stats.totalAssignments > 0
    ? Math.round((stats.approvedAssignments / stats.totalAssignments) * 100) : 0;
  const personaCoverage = stats.totalUsers > 0
    ? Math.round((stats.usersWithPersona / stats.totalUsers) * 100) : 0;

  const assignedDepartments = scopeDepts && scopeDepts.length > 0 ? scopeDepts : null;
  const needsScopeStats = ["mapper", "approver", "coordinator"].includes(user.role);
  const scopedUserIds = await getUserScope(user);

  const overprovisioningThreshold = parseInt(await getSetting("least_access_threshold") ?? "30", 10);

  const [riskAnalysis, scopedStatsData, overprovisioningAlertsRaw] = await Promise.all([
    getAggregateRiskAnalysis(orgId, scopedUserIds),
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
    getLeastAccessAnalysis(orgId, overprovisioningThreshold),
  ]);

  const scopedStats = scopedStatsData;
  const strapline = generateStrapline(stats, user.role, scopedStats, user.displayName);

  let overprovisioningAlerts = overprovisioningAlertsRaw;
  if (needsScopeStats && scopedUserIds !== null && scopedUserIds.length > 0) {
    const scopedPersonaIds = new Set(await getPersonaIdsForUsers(orgId, scopedUserIds));
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

  // Department progress — simplified single-bar view
  const deptProgress = allDeptStatus
    .sort((a, b) => {
      const pctA = a.totalUsers > 0 ? a.approved / a.totalUsers : 0;
      const pctB = b.totalUsers > 0 ? b.approved / b.totalUsers : 0;
      return pctB - pctA;
    })
    .slice(0, 8);

  // Risk severity
  const businessContinuity = getRiskSeverity(riskAnalysis.businessContinuity.usersAtRisk, [5, 20]);
  const adoptionRisk = getRiskSeverity(riskAnalysis.adoption.usersWithNewAccess, [10, 30]);
  const incorrectAccess = getRiskSeverity(riskAnalysis.incorrectAccess.flaggedUsers, [3, 10]);

  return (
    <div className="space-y-6">
      <WorkflowStepper stages={stages} />

      {/* Status Strapline */}
      <div className={`rounded-lg border px-4 py-3 ${straplineBg}`}>
        <div className="flex items-center gap-2.5">
          {straplineIcon}
          <div className="flex-1 text-sm leading-relaxed">
            <span className="text-foreground">{strapline.project}</span>
            {strapline.area && (
              <>
                <span className="mx-2 text-muted-foreground/40">&middot;</span>
                <span className="text-muted-foreground italic">{strapline.area}</span>
              </>
            )}
          </div>
          <StatusSlideButton />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          subtitle={`Across ${allDeptStatus.length} departments`}
          trend={`${stats.totalSourceRoles} roles`}
        />
        <KpiCard
          title="Personas"
          value={stats.totalPersonas}
          subtitle="AI-generated clusters"
          trend={`${personaCoverage}% coverage`}
        />
        <KpiCard
          title="Mapped"
          value={`${stats.personasWithMapping} / ${stats.totalPersonas}`}
          subtitle="Target roles assigned"
          trend={`${mappedPercent}%`}
        />
        <KpiCard
          title="SOD Conflicts"
          value={stats.sodConflictsBySeverity.reduce((s, c) => s + c.count, 0)}
          subtitle={stats.sodConflictsBySeverity.map(s => `${s.count} ${s.severity}`).join(", ") || "None detected"}
          trend={stats.complianceApproved > 0 ? `${Math.round((stats.complianceApproved / Math.max(stats.totalAssignments, 1)) * 100)}% resolved` : undefined}
        />
        <KpiCard
          title="Approved"
          value={`${approvedPercent}%`}
          subtitle={stats.totalAssignments > 0 ? `${stats.approvedAssignments.toLocaleString()} of ${stats.totalAssignments.toLocaleString()} users` : "No assignments yet"}
          trend={approvedPercent >= 80 ? "On target" : undefined}
        />
      </div>

      {/* Risk Quantification */}
      {riskAnalysis.totalUsersAnalyzed > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Risk Quantification</h3>
            <Link href="/risk-analysis" className="text-xs text-teal-600 hover:text-teal-700 font-medium">
              View full analysis &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="glass-card rounded-2xl p-6 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-brand-text">Business Continuity</h3>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${businessContinuity.classes}`}>
                  {businessContinuity.label}
                </span>
              </div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                {riskAnalysis.businessContinuity.avgCoverage}% average coverage preserved. {riskAnalysis.businessContinuity.usersAtRisk} users below 90% threshold.
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-brand-text">Adoption Risk</h3>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${adoptionRisk.classes}`}>
                  {adoptionRisk.label}
                </span>
              </div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                {riskAnalysis.adoption.usersWithNewAccess} users with significant role changes. {riskAnalysis.adoption.totalNewPerms} total new permissions.
              </p>
            </div>
            <div className="glass-card rounded-2xl p-6 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-brand-text">Incorrect Access</h3>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${incorrectAccess.classes}`}>
                  {incorrectAccess.label}
                </span>
              </div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                {riskAnalysis.incorrectAccess.flaggedUsers} flagged users (access gaps + SOD conflicts).
              </p>
            </div>
          </div>
        </>
      )}

      {/* Two-column: Department Progress + Recent Activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Department Progress */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-brand-text">Department Progress</h2>
            <span className="text-[11px] text-brand-text-light font-medium uppercase tracking-wider">
              {allDeptStatus.length} departments
            </span>
          </div>
          <div className="space-y-3">
            {deptProgress.map((dept) => {
              const progress = dept.totalUsers > 0 ? Math.round((dept.approved / dept.totalUsers) * 100) : 0;
              return (
                <div key={dept.department} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-brand-text w-24 shrink-0 truncate">
                    {dept.department}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-brand-cream-warm overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-accent to-teal-400 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-brand-text-muted w-10 text-right">
                    {progress}%
                  </span>
                  <span className="text-xs text-brand-text-muted w-24 text-right">
                    {dept.approved}/{dept.totalUsers} users
                  </span>
                  {dept.sodRejected > 0 && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      {dept.sodRejected} SOD
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-brand-text mb-5">Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((item) => {
                const isAI = item.actorEmail?.includes("lumen") || item.actorEmail?.includes("system") || item.actorEmail === null;
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isAI
                        ? "bg-brand-accent/15 text-brand-accent-dark"
                        : "bg-brand-cream-warm text-brand-text-muted"
                    }`}>
                      {isAI ? (
                        <Sparkles className="w-3.5 h-3.5" />
                      ) : (
                        getInitials(item.actorEmail)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-brand-text">
                        <span className="font-medium">{isAI ? "Lumen AI" : (item.actorEmail?.split("@")[0] ?? "System")}</span>
                      </div>
                      <div className="text-xs text-brand-text-muted">{formatAction(item.action, item.entityType)}</div>
                      <div className="text-[10px] text-brand-text-light mt-0.5">
                        {item.entityType} &middot; {formatRelativeTime(item.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-brand-text-muted">No recent activity</p>
          )}
        </div>
      </div>

      {/* Inline Lumen AI Chat */}
      <DashboardChat userRole={user.role} userName={user.displayName} />

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

      {/* Detailed Department View + Attention Required — interactive client component */}
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
