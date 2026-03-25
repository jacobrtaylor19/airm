import { requireRole } from "@/lib/auth";
import { AssignmentsClient } from "./assignments-client";

export const dynamic = "force-dynamic";

export default function AdminAssignmentsPage() {
  requireRole(["admin", "system_admin"]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Assign mappers and approvers to departments or individual users.
      </p>
      <AssignmentsClient />
    </div>
  );
}
