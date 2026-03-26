import { NextResponse } from "next/server";
import { sailPointAdapter } from "@/lib/exports/grc-adapters";
import { getSessionUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    auditLog({
      entityType: "export",
      action: "sailpoint_export",
      actorEmail: user.email || user.username,
      metadata: { format: "sailpoint" },
    });

    const buffer = await sailPointAdapter.generate();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sailpoint-provisioning-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = safeError(err, "Export failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
