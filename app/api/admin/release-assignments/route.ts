import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !["admin", "system_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const assignments = await db
    .select({
      id: schema.appUserReleases.id,
      appUserId: schema.appUserReleases.appUserId,
      appUserName: schema.appUsers.displayName,
      appUserRole: schema.appUsers.role,
      releaseId: schema.appUserReleases.releaseId,
      releaseName: schema.releases.name,
      assignedAt: schema.appUserReleases.assignedAt,
    })
    .from(schema.appUserReleases)
    .innerJoin(schema.appUsers, eq(schema.appUsers.id, schema.appUserReleases.appUserId))
    .innerJoin(schema.releases, eq(schema.releases.id, schema.appUserReleases.releaseId));

  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["admin", "system_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { appUserId, releaseId } = body;

  if (!appUserId || !releaseId) {
    return NextResponse.json({ error: "appUserId and releaseId required" }, { status: 400 });
  }

  // Check if assignment already exists
  const [existing] = await db
    .select()
    .from(schema.appUserReleases)
    .where(
      and(
        eq(schema.appUserReleases.appUserId, appUserId),
        eq(schema.appUserReleases.releaseId, releaseId)
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "User is already assigned to this release" }, { status: 409 });
  }

  const [inserted] = await db
    .insert(schema.appUserReleases)
    .values({ appUserId, releaseId })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["admin", "system_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db.delete(schema.appUserReleases)
    .where(eq(schema.appUserReleases.id, Number(id)));

  return NextResponse.json({ ok: true });
}
