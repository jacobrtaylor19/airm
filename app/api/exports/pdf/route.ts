import { NextResponse } from "next/server";
import { generatePdfReport } from "@/lib/exports/pdf-report";
import { getSessionUser } from "@/lib/auth";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = getSessionUser();
    const buffer = await generatePdfReport(user?.displayName ?? undefined);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="provisum-audit-report-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message = safeError(err, "Export failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
