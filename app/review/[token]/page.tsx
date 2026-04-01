import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users, UserCircle, Route, AlertTriangle, Building2 } from "lucide-react";

export const dynamic = "force-dynamic";

async function getReviewSnapshot() {
  const totalUsers = (await db.select({ count: count() }).from(schema.users))[0]!.count;
  const totalPersonas = (await db.select({ count: count() }).from(schema.personas))[0]!.count;
  const totalTargetRoles = (await db.select({ count: count() }).from(schema.targetRoles))[0]!.count;

  const usersWithPersona = Number((await db
    .select({ count: sql<number>`count(distinct ${schema.userPersonaAssignments.userId})` })
    .from(schema.userPersonaAssignments))[0]!.count);

  const personasMapped = Number((await db
    .select({ count: sql<number>`count(distinct ${schema.personaTargetRoleMappings.personaId})` })
    .from(schema.personaTargetRoleMappings))[0]!.count);

  const totalAssignments = (await db.select({ count: count() }).from(schema.userTargetRoleAssignments))[0]!.count;
  const approvedAssignments = (await db
    .select({ count: count() })
    .from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "approved")))[0]!.count;

  const sodConflictsBySeverity = await db
    .select({ severity: schema.sodConflicts.severity, count: count() })
    .from(schema.sodConflicts)
    .groupBy(schema.sodConflicts.severity);

  const departmentStats = await db
    .select({ department: schema.users.department, count: count() })
    .from(schema.users)
    .groupBy(schema.users.department);

  // Top personas by user count
  const topPersonas = await db
    .select({
      name: schema.personas.name,
      userCount: sql<number>`count(${schema.userPersonaAssignments.userId})`,
    })
    .from(schema.personas)
    .leftJoin(schema.userPersonaAssignments, eq(schema.personas.id, schema.userPersonaAssignments.personaId))
    .groupBy(schema.personas.id)
    .orderBy(sql`count(${schema.userPersonaAssignments.userId}) desc`)
    .limit(10);

  return {
    totalUsers,
    totalPersonas,
    totalTargetRoles,
    usersWithPersona,
    personasMapped,
    totalAssignments,
    approvedAssignments,
    sodConflictsBySeverity,
    departmentStats,
    topPersonas,
  };
}

export default async function ReviewPage({ params }: { params: { token: string } }) {
  const { token } = params;

  const [link] = await db
    .select()
    .from(schema.reviewLinks)
    .where(eq(schema.reviewLinks.token, token));

  if (!link) notFound();

  // Check expiry
  if (new Date(link.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-900">Link Expired</h2>
            <p className="text-sm text-slate-500 mt-2">This review link has expired. Please request a new one from the project administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = await getReviewSnapshot();
  const personasMappedPct = data.totalPersonas > 0 ? Math.round((data.personasMapped / data.totalPersonas) * 100) : 0;
  const approvalPct = data.totalAssignments > 0 ? Math.round((data.approvedAssignments / data.totalAssignments) * 100) : 0;
  const totalSod = data.sodConflictsBySeverity.reduce((a, b) => a + b.count, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-teal-500" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">Provisum — External Review</h1>
            <p className="text-xs text-slate-500">Read-only project snapshot</p>
          </div>
          <Badge variant="outline" className="ml-auto text-xs">View Only</Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-teal-500" />
              <p className="text-2xl font-bold">{data.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <UserCircle className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold">{data.totalPersonas}</p>
              <p className="text-xs text-slate-500">Personas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <Route className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{personasMappedPct}%</p>
              <p className="text-xs text-slate-500">Personas Mapped</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold">{totalSod}</p>
              <p className="text-xs text-slate-500">SOD Conflicts</p>
            </CardContent>
          </Card>
        </div>

        {/* Approval Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapping Approval Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">{data.approvedAssignments} of {data.totalAssignments} assignments approved</span>
              <span className="text-sm font-semibold">{approvalPct}%</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${approvalPct}%` }} />
            </div>
          </CardContent>
        </Card>

        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Department Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.departmentStats.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.departmentStats.map((d) => (
                  <div key={d.department ?? "Unknown"} className="rounded-md border border-slate-200 px-3 py-2">
                    <p className="text-sm font-medium text-slate-800 truncate">{d.department ?? "Unknown"}</p>
                    <p className="text-xs text-slate-500">{d.count} users</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No department data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Persona Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle className="h-4 w-4" />
              Top Personas by User Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topPersonas.length > 0 ? (
              <div className="space-y-2">
                {data.topPersonas.map((p) => (
                  <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-700">{p.name}</span>
                    <Badge variant="secondary" className="text-xs">{p.userCount} users</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No persona data available.</p>
            )}
          </CardContent>
        </Card>

        {/* SOD Conflicts */}
        {data.sodConflictsBySeverity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                SOD Conflicts by Severity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {data.sodConflictsBySeverity.map((s) => (
                  <div key={s.severity} className="text-center">
                    <p className="text-xl font-bold">{s.count}</p>
                    <Badge variant="outline" className="text-xs capitalize">{s.severity}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-xs text-slate-400">
          Generated by Provisum &middot; This is a read-only snapshot
        </div>
      </main>
    </div>
  );
}
