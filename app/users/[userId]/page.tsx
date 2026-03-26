import { getUserDetail, getAssignedMapperApproverForUser, getUserGapAnalysis } from "@/lib/queries";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { ArrowRight, User, Shield, Users, AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { UserSodConflicts } from "./user-sod-conflicts";

export const dynamic = "force-dynamic";

export default function UserDetailPage({ params }: { params: { userId: string } }) {
  const user = getUserDetail(Number(params.userId));
  if (!user) return notFound();

  const { mapperName, mapperOrgUnitName, approverName, approverOrgUnitName } = getAssignedMapperApproverForUser(user.orgUnitId);
  const gapAnalysis = getUserGapAnalysis(user.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/users" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to Users
        </Link>
        <h2 className="text-xl font-semibold mt-2">{user.displayName}</h2>
        <p className="text-sm text-muted-foreground">
          {user.sourceUserId} &middot; {user.jobTitle ?? "No title"} &middot; {user.department ?? "No department"}
        </p>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> User Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium">{user.email ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Org Unit</span>
              <p className="font-medium">{user.orgUnit ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cost Center</span>
              <p className="font-medium">{user.costCenter ?? "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">User Type</span>
              <p className="font-medium">{user.userType ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Mapper & Approver */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Assigned Mapper & Approver
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Assigned Mapper</span>
              <p className="font-medium">
                {mapperName ? (
                  <>
                    {mapperName}
                    {mapperOrgUnitName && (
                      <span className="text-muted-foreground font-normal text-xs ml-1">(via {mapperOrgUnitName})</span>
                    )}
                  </>
                ) : (
                  <span className="text-amber-600">Unassigned</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Assigned Approver</span>
              <p className="font-medium">
                {approverName ? (
                  <>
                    {approverName}
                    {approverOrgUnitName && (
                      <span className="text-muted-foreground font-normal text-xs ml-1">(via {approverOrgUnitName})</span>
                    )}
                  </>
                ) : (
                  <span className="text-amber-600">Unassigned</span>
                )}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Mapper and approver assignments are managed at the org hierarchy level in the Config Console.
          </p>
        </CardContent>
      </Card>

      {/* Mapping Chain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapping Chain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* Source Roles — grouped by system */}
            <div className="rounded-md border p-3 min-w-[140px]">
              <p className="text-xs text-muted-foreground mb-1">Source Roles</p>
              {user.sourceRoles.length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(
                    user.sourceRoles.reduce<Record<string, typeof user.sourceRoles>>((acc, r) => {
                      const sys = r.system ?? "Unknown";
                      if (!acc[sys]) acc[sys] = [];
                      acc[sys].push(r);
                      return acc;
                    }, {})
                  ).map(([system, roles]) => (
                    <div key={system}>
                      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{system}</p>
                      <div className="flex flex-wrap gap-1">
                        {roles.map((r) => (
                          <Badge key={r.id} variant="outline" className="text-xs">
                            {r.roleName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">None assigned</span>
              )}
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

            {/* Persona */}
            <div className="rounded-md border p-3 min-w-[140px]">
              <p className="text-xs text-muted-foreground mb-1">Persona</p>
              {user.persona ? (
                <div>
                  <Link href={`/personas/${user.persona.id}`} className="font-medium text-primary hover:underline">
                    {user.persona.name}
                  </Link>
                  <div className="mt-1">
                    <ConfidenceBadge score={user.persona.confidenceScore} />
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">Unassigned</span>
              )}
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

            {/* Consolidated Group */}
            <div className="rounded-md border p-3 min-w-[140px]">
              <p className="text-xs text-muted-foreground mb-1">Group</p>
              {user.persona?.groupName ? (
                <p className="font-medium">{user.persona.groupName}</p>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

            {/* Target Roles */}
            <div className="rounded-md border p-3 min-w-[140px]">
              <p className="text-xs text-muted-foreground mb-1">Target Roles</p>
              {user.targetRoleAssignments.length > 0 ? (
                <div className="space-y-2">
                  {/* Existing Production Access */}
                  {user.targetRoleAssignments.filter(a => a.releasePhase === "existing").length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Existing Production Access</p>
                      <div className="space-y-1">
                        {user.targetRoleAssignments.filter(a => a.releasePhase === "existing").map((a) => (
                          <div key={a.id} className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-xs opacity-70">{a.roleName}</Badge>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-muted-foreground">Wave 1</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Current Wave Mapping */}
                  {user.targetRoleAssignments.filter(a => a.releasePhase !== "existing").length > 0 && (
                    <div>
                      {user.targetRoleAssignments.filter(a => a.releasePhase === "existing").length > 0 && (
                        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Current Wave</p>
                      )}
                      <div className="space-y-1">
                        {user.targetRoleAssignments.filter(a => a.releasePhase !== "existing").map((a) => (
                          <div key={a.id} className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs">{a.roleName}</Badge>
                            <StatusBadge status={a.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">Not yet mapped</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gap Analysis */}
      {(gapAnalysis.uncoveredPermissions.length > 0 || gapAnalysis.newPermissions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Permission Gap Analysis
              </span>
              <Badge variant="outline" className={`text-xs ${gapAnalysis.coveragePercent >= 90 ? "bg-emerald-50 text-emerald-700" : gapAnalysis.coveragePercent >= 70 ? "bg-yellow-50 text-yellow-700" : "bg-red-50 text-red-700"}`}>
                {gapAnalysis.coveragePercent}% coverage
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Uncovered Permissions */}
              {gapAnalysis.uncoveredPermissions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    Uncovered Source Permissions ({gapAnalysis.uncoveredPermissions.length})
                  </h4>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {gapAnalysis.uncoveredPermissions.map(p => (
                      <div key={p.permissionId} className="flex items-center justify-between text-xs rounded-md border border-amber-200 bg-amber-50/50 px-2 py-1.5">
                        <div>
                          <span className="font-medium">{p.permissionName ?? p.permissionId}</span>
                          <span className="text-muted-foreground ml-1 font-mono text-[10px]">{p.permissionId}</span>
                        </div>
                        <span className="text-muted-foreground text-[10px]">{p.sourceRoles.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Source permissions not covered by any target role assignment.</p>
                </div>
              )}

              {/* New Permissions */}
              {gapAnalysis.newPermissions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Plus className="h-3 w-3 text-blue-500" />
                    New Target Permissions ({gapAnalysis.newPermissions.length})
                  </h4>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {gapAnalysis.newPermissions.map(p => (
                      <div key={p.permissionId} className="flex items-center justify-between text-xs rounded-md border border-blue-200 bg-blue-50/50 px-2 py-1.5">
                        <div>
                          <span className="font-medium">{p.permissionName ?? p.permissionId}</span>
                          <span className="text-muted-foreground ml-1 font-mono text-[10px]">{p.permissionId}</span>
                        </div>
                        <span className="text-muted-foreground text-[10px]">{p.targetRoles.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Permissions the user will gain in the target system that they did not have in source.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Persona Assignment Details */}
      {user.persona?.reasoning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> AI Assignment Reasoning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{user.persona.reasoning}</p>
          </CardContent>
        </Card>
      )}

      {/* SOD Conflicts — actionable */}
      <UserSodConflicts conflicts={user.sodConflicts} userId={user.id} />
    </div>
  );
}
