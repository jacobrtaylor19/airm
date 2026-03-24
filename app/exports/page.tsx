import { getDashboardStats } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Download, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const exports = [
  {
    title: "Full Excel Report",
    description: "Multi-sheet workbook with user-persona mapping, target role mapping, full chain, SOD conflicts, and gap analysis.",
    icon: FileSpreadsheet,
    href: "/api/exports/excel",
    format: ".xlsx",
  },
  {
    title: "PDF Audit Report",
    description: "Summary audit report with project statistics, department breakdown, persona summary, and risk assessment.",
    icon: FileText,
    href: "/api/exports/pdf",
    format: ".pdf",
  },
  {
    title: "Provisioning CSV",
    description: "Approved target role assignments ready for system import. Only includes assignments with 'approved' status.",
    icon: Download,
    href: "/api/exports/provisioning",
    format: ".csv",
  },
  {
    title: "SOD Exception Report",
    description: "All accepted SOD risks with justifications, resolved-by, and resolution timestamps.",
    icon: AlertTriangle,
    href: "/api/exports/sod-exceptions",
    format: ".csv",
  },
];

export default function ExportsPage() {
  const stats = getDashboardStats();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Exports</h2>
        <p className="text-sm text-muted-foreground">
          Download reports and provisioning files.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exports.map((exp) => (
          <Card key={exp.title}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <exp.icon className="h-4 w-4" />
                {exp.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{exp.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {exp.title === "Full Excel Report" && `${stats.totalUsers} users, ${stats.totalPersonas} personas`}
                  {exp.title === "PDF Audit Report" && `${stats.totalUsers} users across ${stats.departmentStats.length} departments`}
                  {exp.title === "Provisioning CSV" && `${stats.approvedAssignments} approved assignments`}
                  {exp.title === "SOD Exception Report" && `${stats.sodConflictsBySeverity.reduce((a, b) => a + b.count, 0)} total conflicts`}
                </span>
                <a href={exp.href} download>
                  <Button variant="outline" size="sm">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download {exp.format}
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
