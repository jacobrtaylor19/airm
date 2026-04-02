import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!["admin", "system_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const orgId = getOrgId(user);
    const configId = parseInt(params.id, 10);
    const body = await req.json();

    const [existing] = await db
      .select()
      .from(schema.ssoConfigurations)
      .where(and(eq(schema.ssoConfigurations.id, configId), eq(schema.ssoConfigurations.organizationId, orgId)));

    if (!existing) return NextResponse.json({ error: "SSO config not found" }, { status: 404 });

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.providerName !== undefined) updates.providerName = body.providerName;
    if (body.domain !== undefined) updates.domain = body.domain;
    if (body.metadataUrl !== undefined) updates.metadataUrl = body.metadataUrl;
    if (body.metadataXml !== undefined) updates.metadataXml = body.metadataXml;
    if (body.enabled !== undefined) updates.enabled = body.enabled;

    await db.update(schema.ssoConfigurations).set(updates).where(eq(schema.ssoConfigurations.id, configId));

    await auditLog({
      organizationId: orgId,
      entityType: "sso_configuration",
      entityId: configId,
      action: body.enabled === false ? "sso.disabled" : "sso.updated",
      actorEmail: user.email ?? user.username,
    });

    const [updated] = await db.select().from(schema.ssoConfigurations).where(eq(schema.ssoConfigurations.id, configId));
    return NextResponse.json({ config: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!["admin", "system_admin"].includes(user.role)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const orgId = getOrgId(user);
    const configId = parseInt(params.id, 10);

    const [existing] = await db
      .select()
      .from(schema.ssoConfigurations)
      .where(and(eq(schema.ssoConfigurations.id, configId), eq(schema.ssoConfigurations.organizationId, orgId)));

    if (!existing) return NextResponse.json({ error: "SSO config not found" }, { status: 404 });

    await db.delete(schema.ssoConfigurations).where(eq(schema.ssoConfigurations.id, configId));

    await auditLog({
      organizationId: orgId,
      entityType: "sso_configuration",
      entityId: configId,
      action: "sso.deleted",
      actorEmail: user.email ?? user.username,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
