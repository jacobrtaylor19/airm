import { NextResponse } from "next/server";
import { generatePdfReport } from "@/lib/exports/pdf-report";
import { getSessionUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    auditLog({
      organizationId: user.organizationId,
      entityType: "export",
      action: "pdf_export",
      actorEmail: user.email || user.username,
      metadata: { format: "pdf" },
    });

    const buffer = await generatePdfReport(user?.displayName ?? undefined);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="provisum-audit-report-${new Date().toISOString().split("T")[0]}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const message = safeError(err, "Export failed");
    // Return a plain text error instead of JSON so the browser doesn't download a .json file
    return new NextResponse(`PDF generation failed: ${message}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
