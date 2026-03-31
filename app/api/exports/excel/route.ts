import { NextResponse } from "next/server";
import { generateExcelReport } from "@/lib/exports/excel-report";
import { getSessionUser } from "@/lib/auth";
import { safeError } from "@/lib/errors";
import { auditLog } from "@/lib/audit";
import { dispatchWebhookEvent } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    auditLog({
      organizationId: user.organizationId,
      entityType: "export",
      action: "excel_export",
      actorEmail: user.email || user.username,
      metadata: { format: "xlsx" },
    });

    const buffer = await generateExcelReport(user.displayName);

    dispatchWebhookEvent("export.completed", { type: "excel", exportedBy: user.displayName }).catch(() => {});

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="provisum-report-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (err: unknown) {
    const message = safeError(err, "Export failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
