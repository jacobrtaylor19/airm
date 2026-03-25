import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100" },
  persona_assigned: { label: "Persona Assigned", className: "bg-zinc-200 text-zinc-700 hover:bg-zinc-200" },
  sod_rejected: { label: "SOD Rejected", className: "bg-red-100 text-red-700 hover:bg-red-100" },
  compliance_approved: { label: "Compliance OK", className: "bg-green-100 text-green-700 hover:bg-green-100" },
  sod_risk_accepted: { label: "Risk Accepted", className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  ready_for_approval: { label: "Ready for Approval", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "" };
  return (
    <Badge variant="secondary" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
