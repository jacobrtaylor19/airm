import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-100 text-slate-600 hover:bg-slate-100" },
  unmapped: { label: "Unmapped", className: "bg-slate-100 text-slate-600 hover:bg-slate-100" },
  persona_assigned: { label: "Persona Assigned", className: "bg-blue-50 text-blue-700 hover:bg-blue-50" },
  mapped: { label: "Mapped", className: "bg-teal-50 text-teal-700 hover:bg-teal-50" },
  sod_rejected: { label: "SOD Rejected", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  sod_conflict: { label: "SOD Conflict", className: "bg-red-50 text-red-700 hover:bg-red-50" },
  compliance_approved: { label: "Compliance OK", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  sod_risk_accepted: { label: "Risk Accepted", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  ready_for_approval: { label: "Ready for Approval", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" },
  sod_escalated: { label: "Escalated to S/C", className: "bg-purple-100 text-purple-700 hover:bg-purple-100" },
  pending_design_review: { label: "Design Review", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  remap_required: { label: "Remap Required", className: "bg-indigo-100 text-indigo-700 hover:bg-indigo-100" },
  remapping_in_progress: { label: "Remapping", className: "bg-indigo-50 text-indigo-600 hover:bg-indigo-50" },
  compliance_review: { label: "Compliance Review", className: "bg-purple-100 text-purple-700 hover:bg-purple-100" },
  redesign_required: { label: "Redesign Required", className: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  redesign_in_progress: { label: "Redesign In Progress", className: "bg-orange-50 text-orange-600 hover:bg-orange-50" },
  redesign_complete: { label: "Redesign Complete", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  ruleset_updated: { label: "Ruleset Updated", className: "bg-teal-100 text-teal-700 hover:bg-teal-100" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "" };
  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
