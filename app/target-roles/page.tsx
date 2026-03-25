import { getTargetRoles } from "@/lib/queries";

export const dynamic = "force-dynamic";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function TargetRolesPage() {
  const roles = getTargetRoles();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Target Roles</h2>
        <p className="text-sm text-muted-foreground">
          Browse the target system role library.
        </p>
      </div>

      {roles.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No target roles uploaded yet. Upload a target role library on the{" "}
          <a href="/upload" className="text-primary hover:underline">Data Upload</a> page.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>System</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Permissions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-mono text-xs">{role.roleId}</TableCell>
                  <TableCell className="font-medium text-sm">{role.roleName}</TableCell>
                  <TableCell className="text-sm">{role.domain ?? "—"}</TableCell>
                  <TableCell className="text-sm">{role.system ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{role.roleOwner ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {role.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {role.permissionCount > 0 ? (
                      <Badge variant="outline" className="text-xs">{role.permissionCount}</Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
