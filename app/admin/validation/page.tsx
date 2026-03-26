import { requireRole } from "@/lib/auth";
import { ValidationDashboard } from "./validation-dashboard";

export const dynamic = "force-dynamic";

export default function ValidationPage() {
  requireRole(["system_admin"]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pipeline Validation</h1>
        <p className="text-sm text-muted-foreground">
          Trace and verify the full attribution chain: source attributes → persona → target role assignment.
        </p>
      </div>
      <ValidationDashboard />
    </div>
  );
}
