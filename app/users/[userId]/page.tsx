import { getUserDetail } from "@/lib/queries";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { ArrowRight, User, Shield, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function UserDetailPage({ params }: { params: { userId: string } }) {
  const user = getUserDetail(Number(params.userId));
  if (!user) return notFound();

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

      {/* Mapping Chain */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapping Chain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* Source Roles */}
            <div className="rounded-md border p-3 min-w-[140px]">
              <p className="text-xs text-muted-foreground mb-1">Source Roles</p>
              {user.sourceRoles.length > 0 ? (
                <div className="space-y-1">
                  {user.sourceRoles.map((r) => (
                    <Badge key={r.id} variant="outline" className="text-xs mr-1">
                      {r.roleName}
                    </Badge>
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
                <div className="space-y-1">
                  {user.targetRoleAssignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">{a.roleName}</Badge>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground text-xs">Not yet mapped</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* SOD Conflicts */}
      {user.sodConflicts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" /> SOD Conflicts ({user.sodConflicts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.sodConflicts.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <div>
                    <span className="font-medium">{c.ruleName}</span>
                    <span className="text-muted-foreground ml-2">
                      {c.permissionIdA} &harr; {c.permissionIdB}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={c.severity} />
                    <Badge variant="outline" className="text-xs">{c.resolutionStatus}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-100 text-red-800",
    high: "bg-orange-100 text-orange-800",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-blue-100 text-blue-700",
  };
  return (
    <Badge variant="secondary" className={`text-xs ${colors[severity] ?? ""}`}>
      {severity}
    </Badge>
  );
}
