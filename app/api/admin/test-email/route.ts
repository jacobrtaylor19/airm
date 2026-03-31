import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { sendTestEmail } from "@/lib/email";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET — Check whether RESEND_API_KEY is configured (does not reveal the key).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({
    apiKeyConfigured: !!process.env.RESEND_API_KEY,
  });
}

/**
 * POST — Send a test email to verify configuration.
 * Body: { to: string }
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const to = body?.to;

    if (!to || typeof to !== "string" || !to.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    const result = await sendTestEmail(to.trim());

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (err: unknown) {
    const message = safeError(err, "Failed to send test email");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
