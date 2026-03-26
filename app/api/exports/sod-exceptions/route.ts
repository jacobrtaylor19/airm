import { NextResponse } from "next/server";
import { generateSodExceptionCsv } from "@/lib/exports/sod-exception-report";
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
      action: "sod_exceptions_export",
      actorEmail: user.email || user.username,
      metadata: { format: "sod_exceptions" },
    });

    const csv = generateSodExceptionCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="provisum-sod-exceptions-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = safeError(err, "Export failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
