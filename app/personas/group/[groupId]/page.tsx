import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { orgScope } from "@/lib/org-context";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Layers, Target } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConsolidatedGroupDetailPage({
  params,
}: {
  params: { groupId: string };
}) {
  const user = await requireAuth();
  const orgId = getOrgId(user);
  const groupId = parseInt(params.groupId);

  // Fetch group
  const [group] = await db.select().from(schema.consolidatedGroups)
    .where(and(eq(schema.consolidatedGroups.id, groupId), orgScope(schema.consolidatedGroups.organizationId, orgId)));

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Consolidated group not found.</p>
        <Link href="/personas" className="text-teal-600 hover:underline mt-2 text-sm">Back to Personas</Link>
      </div>
    );
  }

  // Fetch personas in this group
  const personas = await db.select({
    id: schema.personas.id,
    name: schema.personas.name,
    businessFunction: schema.personas.businessFunction,
    source: schema.personas.source,
  }).from(schema.personas)
    .where(and(eq(schema.personas.consolidatedGroupId, groupId), orgScope(schema.personas.organizationId, orgId)));

  // Fetch users assigned to these personas
  const personaIds = personas.map(p => p.id);
  const userAssignments = personaIds.length > 0
    ? await db.select({
        userId: schema.users.id,
        displayName: schema.users.displayName,
        department: schema.users.department,
        personaId: schema.userPersonaAssignments.personaId,
        confidenceScore: schema.userPersonaAssignments.confidenceScore,
      }).from(schema.userPersonaAssignments)
        .innerJoin(schema.users, eq(schema.users.id, schema.userPersonaAssignments.userId))
        .where(inArray(schema.userPersonaAssignments.personaId, personaIds))
    : [];

  // Fetch target role mappings for these personas
  const roleMappings = personaIds.length > 0
    ? await db.select({
        personaId: schema.personaTargetRoleMappings.personaId,
        targetRoleId: schema.personaTargetRoleMappings.targetRoleId,
        roleName: schema.targetRoles.roleName,
        roleId: schema.targetRoles.roleId,
        coveragePercent: schema.personaTargetRoleMappings.coveragePercent,
      }).from(schema.personaTargetRoleMappings)
        .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.personaTargetRoleMappings.targetRoleId))
        .where(inArray(schema.personaTargetRoleMappings.personaId, personaIds))
    : [];

  const uniqueUsers = new Map<number, typeof userAssignments[0]>();
  for (const u of userAssignments) uniqueUsers.set(u.userId, u);
  const uniqueRoles = new Map<number, typeof roleMappings[0]>();
  for (const r of roleMappings) uniqueRoles.set(r.targetRoleId, r);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/personas" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Personas
        </Link>
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {group.description && (
          <p className="text-muted-foreground mt-1">{group.description}</p>
        )}
        <div className="flex gap-3 mt-3">
          {group.accessLevel && <Badge variant="outline">{group.accessLevel}</Badge>}
          {group.domain && <Badge variant="secondary">{group.domain}</Badge>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Layers className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-2xl font-bold">{personas.length}</p>
              <p className="text-xs text-muted-foreground">Personas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{uniqueUsers.size}</p>
              <p className="text-xs text-muted-foreground">Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Target className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{uniqueRoles.size}</p>
              <p className="text-xs text-muted-foreground">Target Roles</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personas in this Group</CardTitle>
        </CardHeader>
        <CardContent>
          {personas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No personas assigned to this group.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Business Function</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Target Roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personas.map(p => {
                  const pUsers = userAssignments.filter(u => u.personaId === p.id).length;
                  const pRoles = roleMappings.filter(r => r.personaId === p.id).length;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/personas/${p.id}`} className="font-medium text-teal-700 hover:underline">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.businessFunction || "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{p.source || "AI"}</Badge></TableCell>
                      <TableCell className="text-right">{pUsers}</TableCell>
                      <TableCell className="text-right">{pRoles}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users ({uniqueUsers.size})</CardTitle>
        </CardHeader>
        <CardContent>
          {uniqueUsers.size === 0 ? (
            <p className="text-sm text-muted-foreground">No users assigned to personas in this group.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(uniqueUsers.values()).slice(0, 50).map(u => {
                  const personaName = personas.find(p => p.id === u.personaId)?.name || "—";
                  return (
                    <TableRow key={u.userId}>
                      <TableCell className="font-medium">{u.displayName}</TableCell>
                      <TableCell className="text-muted-foreground">{u.department || "—"}</TableCell>
                      <TableCell>{personaName}</TableCell>
                      <TableCell className="text-right">
                        {u.confidenceScore != null ? `${u.confidenceScore}%` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {uniqueUsers.size > 50 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Showing 50 of {uniqueUsers.size} users
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Target Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Target Roles ({uniqueRoles.size})</CardTitle>
        </CardHeader>
        <CardContent>
          {uniqueRoles.size === 0 ? (
            <p className="text-sm text-muted-foreground">No target roles mapped to personas in this group.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Role ID</TableHead>
                  <TableHead className="text-right">Coverage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(uniqueRoles.values()).map(r => (
                  <TableRow key={r.targetRoleId}>
                    <TableCell className="font-medium">{r.roleName}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{r.roleId}</TableCell>
                    <TableCell className="text-right">
                      {r.coveragePercent != null ? `${r.coveragePercent}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
