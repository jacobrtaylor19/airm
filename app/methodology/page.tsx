import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  UserCircle,
  Route,
  ShieldAlert,
  CheckCircle,
  FileText,
  ShieldCheck,
  Eye,
  ClipboardCheck,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

const steps = [
  {
    icon: Upload,
    title: "Data Ingestion",
    description:
      "Source system data (users, roles, permissions) is uploaded via CSV or direct connector. Provisum normalizes and validates the data before processing.",
  },
  {
    icon: UserCircle,
    title: "AI Persona Generation",
    description:
      "Claude analyzes permission patterns across all users and clusters them into security personas — groups of users with similar access profiles. Each persona represents a distinct access pattern.",
  },
  {
    icon: Route,
    title: "Intelligent Role Mapping",
    description:
      "Personas are mapped to target roles using a least-access algorithm. The AI suggests optimal mappings that minimize excess permissions while maintaining business function coverage.",
  },
  {
    icon: ShieldAlert,
    title: "SOD Conflict Analysis",
    description:
      "Every mapping is checked against your SOD rulebook. Between-role and within-role conflicts are identified, classified by severity, and routed to the right resolver.",
  },
  {
    icon: CheckCircle,
    title: "Structured Approval Workflow",
    description:
      "Mappings flow through a department-scoped approval chain: mapper → approver → compliance. Each step is audited. SOD conflicts must be resolved before approval.",
  },
  {
    icon: FileText,
    title: "Provisioning-Ready Output",
    description:
      "Approved mappings are exported in formats ready for your target system — provisioning CSVs, Excel reports, PDF audit packages, and SOD exception documentation.",
  },
];

const principles = [
  {
    icon: ShieldCheck,
    label: "Least access by default",
    text: "Every mapping minimizes permissions to only what's needed",
  },
  {
    icon: Eye,
    label: "AI transparency",
    text: "Every AI decision shows its reasoning and confidence level",
  },
  {
    icon: ClipboardCheck,
    label: "Audit-ready",
    text: "Full trail of who did what, when, and why",
  },
  {
    icon: UserCheck,
    label: "Human in the loop",
    text: "AI suggests, humans decide. No autonomous role assignments.",
  },
];

export default function MethodologyPage() {
  // Public page — no auth required

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">How Provisum Works</h1>
        <p className="mt-1 text-sm text-slate-500">
          A structured, AI-assisted approach to enterprise role mapping
        </p>
      </div>

      {/* Workflow steps grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, i) => (
          <Card key={i} className="border-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                <step.icon className="h-5 w-5 text-indigo-600" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-900">
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Principles */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Principles</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {principles.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <p.icon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                <div>
                  <span className="font-medium text-slate-900">{p.label}</span>
                  <span className="text-slate-600"> — {p.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
