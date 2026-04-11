import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkBulkRate } from "@/lib/rate-limit-middleware";
import { rotateAllSettings } from "@/lib/encryption";
import { safeError } from "@/lib/errors";
import { reportError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "system_admin") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const rateLimited = await checkBulkRate(request, String(user.id));
  if (rateLimited) return rateLimited;

  if (!process.env.ENCRYPTION_KEY_PREVIOUS) {
    return NextResponse.json(
      { error: "ENCRYPTION_KEY_PREVIOUS environment variable is not set. Set it to the old key before rotating." },
      { status: 400 }
    );
  }

  try {
    const result = await rotateAllSettings();
    return NextResponse.json({
      success: true,
      rotated: result.rotated,
      skipped: result.skipped,
      total: result.total,
    });
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), { context: "key-rotation" });
    return NextResponse.json(
      { error: safeError(err, "Key rotation failed") },
      { status: 500 }
    );
  }
}
