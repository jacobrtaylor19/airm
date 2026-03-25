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

  // Only admin/system_admin can reset confirmations
  if (!["admin", "system_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  let body: { orgUnitId: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { orgUnitId } = body;

  if (!orgUnitId) {
    return NextResponse.json({ error: "orgUnitId is required" }, { status: 400 });
  }

  // Find existing active confirmation
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

  if (!existing) {
    return NextResponse.json({ error: "No active confirmation found for this org unit" }, { status: 404 });
  }

  const now = new Date().toISOString();
  db.update(schema.personaConfirmations)
    .set({
      resetAt: now,
      resetBy: user.id,
    })
    .where(eq(schema.personaConfirmations.id, existing.id))
    .run();

  // Audit log
  db.insert(schema.auditLog)
    .values({
      entityType: "personaConfirmation",
      entityId: existing.id,
      action: "persona_confirmation_reset",
      oldValue: JSON.stringify({ confirmedBy: existing.confirmedBy, confirmedAt: existing.confirmedAt }),
      newValue: JSON.stringify({ resetBy: user.id, resetAt: now }),
      actorEmail: user.email ?? user.username,
    })
    .run();

  return NextResponse.json({ success: true });
}
