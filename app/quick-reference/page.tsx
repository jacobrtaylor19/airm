import { requireAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Route,
  CheckCircle,
  ShieldAlert,
  Users,
  LayoutDashboard,
  FileText,
  UserCog,
  Sparkles,
  Target,
  ClipboardList,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface QRGSection {
  title: string;
  icon: React.ElementType;
  steps: { action: string; detail: string; page?: string }[];
}

function getQRGForRole(role: string): { roleLabel: string; description: string; sections: QRGSection[] } {
  switch (role) {
    case "mapper":
      return {
        roleLabel: "Mapper",
        description: "As a mapper, your job is to review AI-generated personas and assign the correct target roles. You are responsible for the accuracy of role mappings within your assigned business area.",
        sections: [
          {
            title: "Review Your Assigned Personas",
            icon: Users,
            steps: [
              { action: "Go to the Personas page", detail: "Review the AI-generated personas in your assigned departments. Check that user groupings make sense.", page: "/personas" },
              { action: "Expand each persona", detail: "Click the chevron to see the description, business function, and number of users. Flag anything that looks wrong." },
              { action: "Confirm personas", detail: "Once you are satisfied with the personas in your org unit, click Confirm to lock them in." },
            ],
          },
          {
            title: "Map Personas to Target Roles",
            icon: Route,
            steps: [
              { action: "Open Role Mapping", detail: "Navigate to the Role Mapping workspace. Select a persona from the left panel.", page: "/mapping" },
              { action: "Use Auto-Map or drag-and-drop", detail: "Click Auto-Map All (Least Access) for AI suggestions, or manually drag target roles from Available to Mapped." },
              { action: "Review confidence scores", detail: "Check the confidence badge on each mapped role. Low confidence assignments need manual verification." },
              { action: "Save your changes", detail: "Click Save after adjusting mappings. The approver will be notified." },
            ],
          },
          {
            title: "Handle Low Confidence & Gaps",
            icon: ShieldAlert,
            steps: [
              { action: "Check the Gap Analysis tab", detail: "On the Role Mapping page, switch to the Gap Analysis tab to see permissions that are not covered by any target role.", page: "/mapping" },
              { action: "Review Individual Refinements", detail: "Switch to the Individual Refinements tab to see users who may need role overrides beyond their persona default." },
            ],
          },
        ],
      };

    case "approver":
      return {
        roleLabel: "Approver",
        description: "As an approver, you review and approve role mapping assignments submitted by mappers. You ensure the proposed access is appropriate, compliant, and follows least-access principles.",
        sections: [
          {
            title: "Review Approval Queue",
            icon: CheckCircle,
            steps: [
              { action: "Go to Approvals", detail: "Navigate to the Approval Queue to see all assignments waiting for your review.", page: "/approvals" },
              { action: "Review each assignment", detail: "Check the user, persona, target roles, and confidence score. Verify the mapping aligns with business needs." },
              { action: "Approve or reject", detail: "Approve assignments that look correct. Reject assignments that need mapper attention with a comment explaining why." },
            ],
          },
          {
            title: "Check SOD Conflicts",
            icon: ShieldAlert,
            steps: [
              { action: "Review SOD Analysis", detail: "Before approving, check if any assignments have SOD conflicts flagged.", page: "/sod" },
              { action: "Accept risk or reject", detail: "For SOD conflicts: either accept the risk with a documented justification, or reject the assignment back to the mapper." },
            ],
          },
          {
            title: "Monitor Progress",
            icon: LayoutDashboard,
            steps: [
              { action: "Check your dashboard", detail: "The Dashboard shows your approval queue status and pending items.", page: "/dashboard" },
              { action: "Track completion", detail: "Monitor the approval percentage. Your goal is 100% of assignments in your area reviewed." },
            ],
          },
        ],
      };

    case "coordinator":
      return {
        roleLabel: "Coordinator",
        description: "As a coordinator, you oversee the role mapping workflow for your business area. You ensure mappers complete their work, approvers review on time, and the project stays on track.",
        sections: [
          {
            title: "Monitor Your Area's Progress",
            icon: LayoutDashboard,
            steps: [
              { action: "Check the Dashboard", detail: "The department breakdown shows progress by stage for your assigned departments.", page: "/dashboard" },
              { action: "Identify bottlenecks", detail: "Look for departments stuck at 'Not Started' or 'Mapped' — these need mapper or approver attention." },
              { action: "Review the strapline", detail: "The status message at the top gives you a quick summary of what needs attention in your area." },
            ],
          },
          {
            title: "Send Reminders",
            icon: ClipboardList,
            steps: [
              { action: "Go to Send Reminders", detail: "Navigate to the Send Reminders page to notify mappers or approvers about pending work.", page: "/notifications" },
              { action: "Choose a template", detail: "Select a quick message template (mapping pending, approval pending, SOD review) or write a custom message." },
              { action: "Select recipients", detail: "Choose individual mappers/approvers or send to all in a role group." },
            ],
          },
          {
            title: "Review Exports & Audit",
            icon: FileText,
            steps: [
              { action: "Download reports", detail: "Go to Exports to download the full Excel report, PDF audit report, or provisioning CSV.", page: "/exports" },
              { action: "Check audit trail", detail: "Review the Audit Log for a complete record of all actions taken in the system.", page: "/audit-log" },
            ],
          },
        ],
      };

    case "admin":
    case "system_admin":
      return {
        roleLabel: "Administrator",
        description: "As an administrator, you manage the platform configuration, user accounts, AI settings, and the overall migration pipeline. You have full visibility into all data and all workflows.",
        sections: [
          {
            title: "Configure the Project",
            icon: UserCog,
            steps: [
              { action: "Set up releases", detail: "Go to Releases to create and manage migration waves.", page: "/releases" },
              { action: "Upload source data", detail: "Navigate to Data Upload to import users, roles, permissions, and SOD rules.", page: "/upload" },
              { action: "Configure AI settings", detail: "In the Config Console, set your AI provider, API key, model, and confidence thresholds.", page: "/admin" },
            ],
          },
          {
            title: "Run the Pipeline",
            icon: Sparkles,
            steps: [
              { action: "Generate personas", detail: "Go to Personas and click Generate Personas to run AI analysis on your user population.", page: "/personas" },
              { action: "Run full pipeline", detail: "Alternatively, go to Jobs and click Run Full Pipeline to execute all steps sequentially.", page: "/jobs" },
              { action: "Monitor progress", detail: "Watch the progress bars on each step. Check for failures in the Job History table." },
            ],
          },
          {
            title: "Manage Users & Assignments",
            icon: Users,
            steps: [
              { action: "Create app users", detail: "Go to App Users to create mapper, approver, and coordinator accounts.", page: "/admin/users" },
              { action: "Assign org units", detail: "In Assignments, link each mapper/approver/coordinator to their business area.", page: "/admin/assignments" },
              { action: "Monitor the dashboard", detail: "The Dashboard gives you the executive project overview with all KPIs.", page: "/dashboard" },
            ],
          },
          {
            title: "Export & Audit",
            icon: Target,
            steps: [
              { action: "Download provisioning files", detail: "Go to Exports for the provisioning CSV (approved assignments only).", page: "/exports" },
              { action: "Review audit trail", detail: "The Audit Log shows every action taken in the system.", page: "/audit-log" },
            ],
          },
        ],
      };

    default: // viewer
      return {
        roleLabel: "Viewer",
        description: "As a viewer, you have read-only access to the Provisum platform. You can review data, dashboards, and reports but cannot make changes or approve assignments.",
        sections: [
          {
            title: "Review Project Status",
            icon: LayoutDashboard,
            steps: [
              { action: "Check the Dashboard", detail: "View overall project progress, KPI cards, and department breakdown.", page: "/dashboard" },
              { action: "Browse personas", detail: "Go to Personas to see the AI-generated security groups.", page: "/personas" },
              { action: "Review mappings", detail: "Navigate to Role Mapping to see how personas are mapped to target roles.", page: "/mapping" },
            ],
          },
          {
            title: "Download Reports",
            icon: FileText,
            steps: [
              { action: "Go to Exports", detail: "Download the Excel report, PDF audit report, or other available exports.", page: "/exports" },
            ],
          },
        ],
      };
  }
}

export default async function QuickReferencePage() {
  const user = await requireAuth();
  const qrg = getQRGForRole(user.role);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Quick Reference Guide</h1>
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">{qrg.roleLabel}</Badge>
        </div>
        <p className="text-sm text-slate-500">{qrg.description}</p>
      </div>

      <div className="space-y-4">
        {qrg.sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <Card key={i}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className="h-4 w-4 text-teal-500" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {section.steps.map((step, j) => (
                    <li key={j} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                        {j + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{step.action}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
