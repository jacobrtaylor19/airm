import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!["admin", "system_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const orgId = getOrgId(user);
    const configs = await db
      .select()
      .from(schema.ssoConfigurations)
      .where(eq(schema.ssoConfigurations.organizationId, orgId));

    return NextResponse.json({ configs });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!["admin", "system_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const orgId = getOrgId(user);
    const body = await req.json();

    const { provider, providerName, domain, metadataUrl, metadataXml } = body;
    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    const [config] = await db.insert(schema.ssoConfigurations).values({
      organizationId: orgId,
      provider,
      providerName: providerName || null,
      domain: domain || null,
      metadataUrl: metadataUrl || null,
      metadataXml: metadataXml || null,
      enabled: false,
    }).returning();

    await auditLog({
      organizationId: orgId,
      entityType: "sso_configuration",
      entityId: config.id,
      action: "sso.created",
      actorEmail: user.email ?? user.username,
      newValue: JSON.stringify({ provider, providerName, domain }),
    });

    return NextResponse.json({ config });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
