import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { reportError } from "@/lib/monitoring";

// GET /api/admin/orgs — list all orgs with user counts (system_admin only)
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "system_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await db
      .select({
        id: schema.organizations.id,
        name: schema.organizations.name,
        slug: schema.organizations.slug,
        description: schema.organizations.description,
        planTier: schema.organizations.planTier,
        maxUsers: schema.organizations.maxUsers,
        licenseYears: schema.organizations.licenseYears,
        licenseExpiresAt: schema.organizations.licenseExpiresAt,
        isActive: schema.organizations.isActive,
        createdAt: schema.organizations.createdAt,
        updatedAt: schema.organizations.updatedAt,
        userCount: count(schema.appUsers.id),
      })
      .from(schema.organizations)
      .leftJoin(
        schema.appUsers,
        eq(schema.appUsers.organizationId, schema.organizations.id)
      )
      .groupBy(schema.organizations.id)
      .orderBy(desc(schema.organizations.createdAt));

    return NextResponse.json(rows);
  } catch (err) {
    reportError(err, { route: "GET /api/admin/orgs" });
    return NextResponse.json({ error: "Failed to load organizations" }, { status: 500 });
  }
}

// PATCH /api/admin/orgs — suspend or activate an org by id
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "system_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { id: number; isActive: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.id !== "number" || typeof body.isActive !== "boolean") {
    return NextResponse.json({ error: "id and isActive are required" }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(schema.organizations)
      .set({ isActive: body.isActive, updatedAt: new Date().toISOString() })
      .where(eq(schema.organizations.id, body.id))
      .returning({ id: schema.organizations.id, isActive: schema.organizations.isActive });

    if (!updated) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    reportError(err, { route: "PATCH /api/admin/orgs" });
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}
