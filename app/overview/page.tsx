import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Server,
  Brain,
  ShieldCheck,
  Cookie,
  Users,
  Building2,
  ClipboardCheck,
  ScanSearch,
} from "lucide-react";

export const dynamic = "force-dynamic";

const capabilities = [
  {
    icon: Server,
    title: "Multi-System Support",
    description:
      "Supports enterprise platforms including SAP S/4HANA, Oracle Cloud, and Workday. Upload source data from any system via CSV or structured import.",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description:
      "Claude (Anthropic) drives persona generation, role mapping suggestions, and conflict explanation. Every recommendation includes confidence scores and reasoning.",
  },
  {
    icon: Users,
    title: "Role-Based Access Control",
    description:
      "Six distinct roles — from viewer to system admin — each with org-unit scoping that limits data visibility to the appropriate department hierarchy.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance-First Design",
    description:
      "SOD analysis, structured approval workflows, and a full audit trail are built into every step of the mapping process. Nothing ships without sign-off.",
  },
];

const securityItems = [
  { icon: Cookie, text: "Cookie-based session authentication" },
  { icon: Users, text: "Role-based access control with 6 permission levels" },
  { icon: Building2, text: "Org-unit scoping limits data visibility" },
  { icon: ClipboardCheck, text: "Full audit trail on every action" },
  { icon: ScanSearch, text: "SOD analysis integrated into the mapping workflow" },
];

export default function OverviewPage() {
  // Public page — no auth required

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          Provisum — Intelligent Role Mapping for Enterprise Migrations
        </p>
      </div>

      {/* Key Capabilities */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Key Capabilities</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {capabilities.map((cap, i) => (
            <Card key={i} className="border-slate-200 bg-white">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                  <cap.icon className="h-5 w-5 text-teal-600" />
                </div>
                <CardTitle className="text-base font-semibold text-slate-900">
                  {cap.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-slate-600">{cap.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Platform Architecture */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Platform Architecture</h2>
        <Card className="border-slate-200 bg-white">
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed text-slate-600">
              Provisum is built on Next.js 14 with a SQLite database, Drizzle ORM, and shadcn/ui
              components. The AI pipeline uses Claude (Anthropic) for persona generation, role
              mapping suggestions, and natural language explanations. All data stays within your
              infrastructure — no external data processing.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security & Compliance */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Security &amp; Compliance</h2>
        <Card className="border-slate-200 bg-white">
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {securityItems.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                    <item.icon className="h-4 w-4 text-teal-600" />
                  </div>
                  <span className="text-sm text-slate-700">{item.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
