import { getSodRules } from "@/lib/queries";

export const dynamic = "force-dynamic";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

export default function SodRulesPage() {
  const rules = getSodRules();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Browse the uploaded SOD/GRC ruleset.
      </p>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-muted-foreground text-center max-w-md">
              No SOD ruleset uploaded. Upload a SOD/GRC ruleset on the{" "}
              <Link href="/upload" className="text-primary hover:underline">Data Upload</Link>{" "}
              page to enable conflict analysis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Permission A</TableHead>
                <TableHead>Permission B</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-mono text-xs">{rule.ruleId}</TableCell>
                  <TableCell className="font-medium text-sm">{rule.ruleName}</TableCell>
                  <TableCell className="font-mono text-xs">{rule.permissionA}</TableCell>
                  <TableCell className="font-mono text-xs">{rule.permissionB}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${severityColors[rule.severity] ?? ""}`}
                    >
                      {rule.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {rule.riskDescription ?? "—"}
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
