import { NextResponse } from "next/server";
import { generateExcelReport } from "@/lib/exports/excel-report";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const buffer = await generateExcelReport();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="provisum-report-${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
