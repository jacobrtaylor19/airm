import { NextResponse } from "next/server";
import { sailPointAdapter } from "@/lib/exports/grc-adapters";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
