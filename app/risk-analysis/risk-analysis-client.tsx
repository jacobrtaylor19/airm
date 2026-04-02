"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, TrendingUp, Users, ShieldCheck } from "lucide-react";
import type { AggregateRiskAnalysis } from "@/lib/queries";

interface Props {
  risk: AggregateRiskAnalysis;
}

function riskLevel(value: number, thresholds: [number, number]): "low" | "medium" | "high" {
  if (value <= thresholds[0]) return "low";
  if (value <= thresholds[1]) return "medium";
  return "high";
}

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    high: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <Badge variant="outline" className={styles[level]}>
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </Badge>
  );
}

export function RiskAnalysisClient({ risk }: Props) {
  const bcLevel = riskLevel(risk.businessContinuity.usersAtRisk, [5, 20]);
  const adoptionLevel = riskLevel(risk.adoption.usersWithNewAccess, [10, 30]);
  const accessLevel = riskLevel(risk.incorrectAccess.flaggedUsers, [3, 10]);
  const integrityLevel = riskLevel(risk.roleIntegrity.rolesWithViolations, [0, 3]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Business Continuity */}
        <Card className={bcLevel === "high" ? "border-red-200" : bcLevel === "medium" ? "border-yellow-200" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Business Continuity
              </CardTitle>
              <RiskBadge level={bcLevel} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Users who may lose access to capabilities they need after migration.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold tabular-nums">{risk.businessContinuity.usersAtRisk}</p>
                <p className="text-xs text-muted-foreground">Users at risk (&lt;90% coverage)</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{risk.businessContinuity.avgCoverage}%</p>
                <p className="text-xs text-muted-foreground">Avg permission coverage</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {risk.businessContinuity.totalUncoveredPerms} total uncovered permissions
            </div>
          </CardContent>
        </Card>

        {/* Adoption Risk */}
        <Card className={adoptionLevel === "high" ? "border-red-200" : adoptionLevel === "medium" ? "border-yellow-200" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Adoption Risk
              </CardTitle>
              <RiskBadge level={adoptionLevel} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Users receiving significant new permissions they did not previously have.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold tabular-nums">{risk.adoption.usersWithNewAccess}</p>
                <p className="text-xs text-muted-foreground">Users with excess new perms (&gt;10)</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{risk.adoption.totalNewPerms}</p>
                <p className="text-xs text-muted-foreground">Total new permissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incorrect Access */}
        <Card className={accessLevel === "high" ? "border-red-200" : accessLevel === "medium" ? "border-yellow-200" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                Incorrect Access
              </CardTitle>
              <RiskBadge level={accessLevel} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Users with both coverage gaps AND active SOD conflicts.
            </p>
            <div>
              <p className="text-2xl font-bold tabular-nums">{risk.incorrectAccess.flaggedUsers}</p>
              <p className="text-xs text-muted-foreground">Flagged users requiring review</p>
            </div>
          </CardContent>
        </Card>

        {/* Role Integrity */}
        <Card className={integrityLevel === "high" ? "border-violet-300" : integrityLevel === "medium" ? "border-violet-200" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-500" />
                Role Integrity
              </CardTitle>
              <RiskBadge level={integrityLevel} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {risk.roleIntegrity.rolesWithViolations === 0 ? (
              <p className="text-xs text-emerald-600 font-medium">No structural role violations detected.</p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Roles with structural SOD violations embedded in their definition.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-violet-600">{risk.roleIntegrity.rolesWithViolations}</p>
                    <p className="text-xs text-muted-foreground">Compromised Roles</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{risk.roleIntegrity.affectedUsers}</p>
                    <p className="text-xs text-muted-foreground">Affected Users</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {risk.roleIntegrity.criticalOrHighRoles} critical or high severity
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analysis Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="h-4 w-4" />
            Analysis Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="rounded-md border p-3">
              <p className="text-lg font-bold tabular-nums">{risk.totalUsersAnalyzed}</p>
              <p className="text-xs text-muted-foreground">Users analyzed</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-lg font-bold tabular-nums">{risk.businessContinuity.avgCoverage}%</p>
              <p className="text-xs text-muted-foreground">Avg coverage</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-lg font-bold tabular-nums text-orange-600">{risk.businessContinuity.usersAtRisk}</p>
              <p className="text-xs text-muted-foreground">Below 90% coverage</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-lg font-bold tabular-nums text-red-600">{risk.incorrectAccess.flaggedUsers}</p>
              <p className="text-xs text-muted-foreground">Flagged (gaps + SOD)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flagged Users Table */}
      {risk.incorrectAccess.flaggedUserList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Flagged Users ({risk.incorrectAccess.flaggedUserList.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Users with both uncovered source permissions and active SOD conflicts. These require immediate review.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">User</th>
                    <th className="pb-2 pr-4 font-medium">Department</th>
                    <th className="pb-2 pr-4 font-medium text-right">Coverage</th>
                    <th className="pb-2 pr-4 font-medium text-right">Uncovered</th>
                    <th className="pb-2 pr-4 font-medium text-right">New Perms</th>
                    <th className="pb-2 font-medium text-right">SOD Conflicts</th>
                  </tr>
                </thead>
                <tbody>
                  {risk.incorrectAccess.flaggedUserList.map((u) => (
                    <tr key={u.userId} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-2 pr-4 font-medium">{u.userName}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{u.department ?? "—"}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        <span className={u.coveragePercent < 80 ? "text-red-600 font-medium" : u.coveragePercent < 90 ? "text-orange-600" : ""}>
                          {u.coveragePercent}%
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-orange-600">{u.uncoveredPermCount}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{u.newPermCount}</td>
                      <td className="py-2 text-right">
                        <Badge variant="destructive" className="text-xs tabular-nums">
                          {u.sodConflictCount}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
