import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * Public endpoint — looks up SSO provider by email domain.
 * GET /api/auth/sso?email=user@company.com
 */
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const domain = email.split("@")[1].toLowerCase();

    const configs = await db
      .select()
      .from(schema.ssoConfigurations)
      .where(and(
        eq(schema.ssoConfigurations.domain, domain),
        eq(schema.ssoConfigurations.enabled, true),
      ));

    if (configs.length === 0) {
      return NextResponse.json({
        found: false,
        message: `No SSO provider configured for ${domain}. Contact your administrator to set up SSO.`,
      });
    }

    const config = configs[0];

    // In a production setup, this would redirect to Supabase SSO sign-in URL.
    // For the MVP, we return the provider info so the UI can display it.
    return NextResponse.json({
      found: true,
      provider: config.provider,
      providerName: config.providerName,
      // Note: Actual SSO redirect requires Supabase Enterprise plan
      // and the supabaseSsoId to be configured.
      ssoConfigured: !!config.supabaseSsoId,
      message: config.supabaseSsoId
        ? "SSO is configured. Redirecting..."
        : "SSO provider is registered but not yet activated. Contact support to complete setup.",
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
