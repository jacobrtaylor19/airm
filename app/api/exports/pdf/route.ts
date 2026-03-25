import { NextResponse } from "next/server";
import { generatePdfReport } from "@/lib/exports/pdf-report";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const buffer = await generatePdfReport();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="airm-audit-report-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
