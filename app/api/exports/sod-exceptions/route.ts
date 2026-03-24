import { NextResponse } from "next/server";
import { generateSodExceptionCsv } from "@/lib/exports/sod-exception-report";

export async function GET() {
  try {
    const csv = generateSodExceptionCsv();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="airm-sod-exceptions-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
