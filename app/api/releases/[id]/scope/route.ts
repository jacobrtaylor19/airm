import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["admin", "system_admin"];
async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user !== null && ADMIN_ROLES.includes(user.role);
}

type Params = { params: { id: string } };

// GET /api/releases/[id]/scope — return org units and users in scope for this release
export async function GET(_req: NextRequest, { params }: Params) {
  const releaseId = parseInt(params.id);
  if (!releaseId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const orgUnits = await db
    .select({
      id: schema.releaseOrgUnits.id,
      orgUnitId: schema.releaseOrgUnits.orgUnitId,
      name: schema.orgUnits.name,
      level: schema.orgUnits.level,
      addedAt: schema.releaseOrgUnits.addedAt,
    })
    .from(schema.releaseOrgUnits)
    .innerJoin(schema.orgUnits, eq(schema.releaseOrgUnits.orgUnitId, schema.orgUnits.id))
    .where(eq(schema.releaseOrgUnits.releaseId, releaseId));

  const users = await db
    .select({
      id: schema.releaseUsers.id,
      userId: schema.releaseUsers.userId,
      displayName: schema.users.displayName,
      department: schema.users.department,
      addedAt: schema.releaseUsers.addedAt,
    })
    .from(schema.releaseUsers)
    .innerJoin(schema.users, eq(schema.releaseUsers.userId, schema.users.id))
    .where(eq(schema.releaseUsers.releaseId, releaseId));

  return NextResponse.json({ orgUnits, users });
}

// POST /api/releases/[id]/scope — add org units or users to scope
// Body: { type: "org_unit" | "user", ids: number[] }
export async function POST(req: NextRequest, { params }: Params) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin role required" }, { status: 403 });

  const releaseId = parseInt(params.id);
  const body = await req.json();
  const { type, ids } = body as { type: "org_unit" | "user"; ids: number[] };

  if (!["org_unit", "user"].includes(type) || !Array.isArray(ids)) {
    return NextResponse.json({ error: "type and ids required" }, { status: 400 });
  }

  const currentUser = await getSessionUser();
  const addedBy = currentUser?.username ?? "admin";

  if (type === "org_unit") {
    for (const orgUnitId of ids) {
      // Skip if already exists
      const [exists] = await db
        .select()
        .from(schema.releaseOrgUnits)
        .where(and(eq(schema.releaseOrgUnits.releaseId, releaseId), eq(schema.releaseOrgUnits.orgUnitId, orgUnitId)))
        .limit(1);
      if (!exists) {
        await db.insert(schema.releaseOrgUnits).values({ releaseId, orgUnitId, addedBy });
      }
    }
  } else {
    for (const userId of ids) {
      const [exists] = await db
        .select()
        .from(schema.releaseUsers)
        .where(and(eq(schema.releaseUsers.releaseId, releaseId), eq(schema.releaseUsers.userId, userId)))
        .limit(1);
      if (!exists) {
        await db.insert(schema.releaseUsers).values({ releaseId, userId, addedBy });
      }
    }
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/releases/[id]/scope?type=org_unit&scopeId=5
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin role required" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const scopeId = parseInt(searchParams.get("scopeId") ?? "");

  if (!type || !scopeId) return NextResponse.json({ error: "type and scopeId required" }, { status: 400 });

  if (type === "org_unit") {
    await db.delete(schema.releaseOrgUnits).where(eq(schema.releaseOrgUnits.id, scopeId));
  } else {
    await db.delete(schema.releaseUsers).where(eq(schema.releaseUsers.id, scopeId));
  }

  return NextResponse.json({ success: true });
}
