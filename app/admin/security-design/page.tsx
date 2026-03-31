import { requireRole } from "@/lib/auth";
import { SecurityDesignClient } from "./security-design-client";

export const dynamic = "force-dynamic";

export default async function SecurityDesignPage() {
  await requireRole(["system_admin", "admin"]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Design Review</h1>
        <p className="text-sm text-muted-foreground">
          Connect to the target system, pull the security design, and review detected changes.
        </p>
      </div>
      <SecurityDesignClient />
    </div>
  );
}
