import { getDashboardStats } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileText, Download, AlertTriangle, Database, Cloud, Shield } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { ReviewLinkButton } from "./review-link-button";

export const dynamic = "force-dynamic";

const exports = [
  {
    title: "Full Excel Report",
    description: "Multi-sheet workbook with cover sheet, executive summary, user-persona mapping, target role mapping, full chain, SOD conflicts, and gap analysis.",
    icon: FileSpreadsheet,
    href: "/api/exports/excel",
    format: ".xlsx",
    accent: "border-l-4 border-l-teal-500",
  },
  {
    title: "PDF Audit Report",
    description: "Summary audit report with cover page, executive summary, department breakdown, persona summary, and risk assessment.",
    icon: FileText,
    href: "/api/exports/pdf",
    format: ".pdf",
    accent: "border-l-4 border-l-slate-500",
  },
  {
    title: "Provisioning CSV",
    description: "Approved target role assignments ready for system import. Only includes assignments with 'approved' status.",
    icon: Download,
    href: "/api/exports/provisioning",
    format: ".csv",
    accent: "border-l-4 border-l-emerald-500",
  },
  {
    title: "SOD Exception Report",
    description: "All accepted SOD risks with justifications, resolved-by, and resolution timestamps.",
    icon: AlertTriangle,
    href: "/api/exports/sod-exceptions",
    format: ".csv",
    accent: "border-l-4 border-l-amber-500",
  },
];

const grcExports = [
  {
    title: "SAP GRC Export",
    description: "Provisioning file formatted for SAP GRC Access Control. Includes Username, RoleID, RoleName, ValidFrom, ValidTo, Action, and SystemID columns.",
    icon: Database,
    href: "/api/exports/grc/sap",
    format: ".csv",
    accent: "border-l-4 border-l-blue-500",
  },
  {
    title: "ServiceNow Export",
    description: "Role assignment import file for ServiceNow. Includes user_name, role, assignment_group, state, and sys_domain columns.",
    icon: Cloud,
    href: "/api/exports/grc/servicenow",
    format: ".csv",
    accent: "border-l-4 border-l-purple-500",
  },
  {
    title: "SailPoint Export",
    description: "Identity provisioning file for SailPoint IdentityNow. Includes identityName, applicationName, entitlementName, operation, and source columns.",
    icon: Shield,
    href: "/api/exports/grc/sailpoint",
    format: ".csv",
    accent: "border-l-4 border-l-orange-500",
  },
];

export default async function ExportsPage() {
  const user = await getSessionUser();
  const orgId = getOrgId(user!);
  const stats = await getDashboardStats(orgId);
  const isAdmin = user ? ["admin", "system_admin"].includes(user.role) : false;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Download reports and provisioning files.
      </p>

      <ReviewLinkButton isAdmin={isAdmin} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exports.map((exp) => (
          <Card key={exp.title} className={exp.accent}>
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

      {/* GRC Provisioning Section */}
      <div>
        <h2 className="text-lg font-semibold mb-1">GRC Provisioning</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Export approved role assignments in formats compatible with major GRC platforms.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {grcExports.map((exp) => (
            <Card key={exp.title} className={exp.accent}>
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
                    {stats.approvedAssignments === 0
                      ? "0 approved assignments"
                      : `${stats.approvedAssignments} approved assignments`}
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
    </div>
  );
}
