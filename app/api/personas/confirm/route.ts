import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { orgUnitId } = body as { orgUnitId: number };

  if (!orgUnitId) {
    return NextResponse.json({ error: "orgUnitId is required" }, { status: 400 });
  }

  // Authorization: admin/system_admin can confirm any org unit;
  // mapper can only confirm their assigned org unit
  const isAdmin = ["admin", "system_admin"].includes(user.role);
  const isMapper = user.role === "mapper";

  if (!isAdmin && !isMapper) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  if (isMapper && user.assignedOrgUnitId !== orgUnitId) {
    return NextResponse.json(
      { error: "You can only confirm personas for your assigned org unit" },
      { status: 403 }
    );
  }

  // Check org unit exists
  const orgUnit = db
    .select()
    .from(schema.orgUnits)
    .where(eq(schema.orgUnits.id, orgUnitId))
    .get();

  if (!orgUnit) {
    return NextResponse.json({ error: "Org unit not found" }, { status: 404 });
  }

  // Check if already confirmed (not reset)
  const existing = db
    .select()
    .from(schema.personaConfirmations)
    .where(
      and(
        eq(schema.personaConfirmations.orgUnitId, orgUnitId),
        isNull(schema.personaConfirmations.resetAt)
      )
    )
    .get();

  if (existing) {
    return NextResponse.json({ error: "Personas already confirmed for this org unit" }, { status: 409 });
  }

  const now = new Date().toISOString();
  const row = db
    .insert(schema.personaConfirmations)
    .values({
      orgUnitId,
      confirmedAt: now,
      confirmedBy: user.id,
    })
    .returning()
    .get();

  // Audit log
  db.insert(schema.auditLog)
    .values({
      entityType: "personaConfirmation",
      entityId: row.id,
      action: "persona_confirmed",
      newValue: JSON.stringify({ orgUnitId, confirmedBy: user.id }),
      actorEmail: user.email ?? user.username,
    })
    .run();

  return NextResponse.json({ success: true, confirmation: row });
}
