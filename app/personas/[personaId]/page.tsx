import { getPersonaDetail } from "@/lib/queries";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function PersonaDetailPage({ params }: { params: { personaId: string } }) {
  const persona = getPersonaDetail(Number(params.personaId));
  if (!persona) return notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/personas" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Personas
          </Link>
          <h2 className="text-xl font-semibold mt-2">{persona.name}</h2>
          <p className="text-sm text-muted-foreground">
            {persona.businessFunction ?? "No function"} &middot; {persona.groupName ?? "No group"} &middot;
            <Badge variant="outline" className="text-xs ml-1">
              {persona.source === "ai" ? "AI Generated" : persona.source === "manual_upload" ? "Uploaded" : "Manual"}
            </Badge>
          </p>
        </div>
        <Button variant="outline" size="sm" disabled>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
        </Button>
      </div>

      {persona.description && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm">{persona.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Characteristic Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Characteristic Permissions ({persona.sourcePermissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {persona.sourcePermissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {persona.sourcePermissions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.permissionId}</TableCell>
                      <TableCell className="text-sm">{p.permissionName ?? "—"}</TableCell>
                      <TableCell className="text-right text-sm">
                        {p.isRequired && <Badge className="text-xs mr-1 bg-blue-100 text-blue-700 hover:bg-blue-100">Required</Badge>}
                        {p.weight?.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No characteristic permissions defined yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Assigned Users ({persona.users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {persona.users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {persona.users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Link href={`/users/${u.id}`} className="text-sm text-primary hover:underline">
                          {u.displayName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{u.department ?? "—"}</TableCell>
                      <TableCell>
                        <ConfidenceBadge score={u.confidenceScore} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users assigned to this persona.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Target Role Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" /> Target Role Mappings ({persona.targetRoleMappings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {persona.targetRoleMappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role ID</TableHead>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {persona.targetRoleMappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.roleId}</TableCell>
                    <TableCell className="text-sm font-medium">{m.roleName}</TableCell>
                    <TableCell className="text-sm">
                      {m.coveragePercent != null ? `${Math.round(m.coveragePercent)}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{m.confidence ?? "—"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Not yet mapped. Run target role mapping from the{" "}
              <Link href="/jobs" className="text-primary hover:underline">Jobs</Link> page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
