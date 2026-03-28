import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST — accept an exception
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!["admin", "system_admin", "approver"].includes(user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { personaId, targetRoleId, excessPercent, justification } = body;

  if (!personaId || !targetRoleId || !justification?.trim()) {
    return NextResponse.json({ error: "personaId, targetRoleId, and justification are required" }, { status: 400 });
  }

  // Revoke any existing accepted exception first (upsert by revoking then inserting)
  const [existing] = await db
    .select({ id: schema.leastAccessExceptions.id })
    .from(schema.leastAccessExceptions)
    .where(
      and(
        eq(schema.leastAccessExceptions.personaId, personaId),
        eq(schema.leastAccessExceptions.targetRoleId, targetRoleId),
        eq(schema.leastAccessExceptions.status, "accepted"),
      )
    )
    .limit(1);

  if (existing) {
    await db.update(schema.leastAccessExceptions)
      .set({
        status: "revoked",
        revokedBy: user.username,
        revokedAt: new Date().toISOString(),
      })
      .where(eq(schema.leastAccessExceptions.id, existing.id));
  }

  await db.insert(schema.leastAccessExceptions)
    .values({
      personaId,
      targetRoleId,
      excessPercent: excessPercent ?? null,
      justification: justification.trim(),
      acceptedBy: user.username,
      acceptedAt: new Date().toISOString(),
      status: "accepted",
    });

  return NextResponse.json({ ok: true });
}

// DELETE — revoke an exception
export async function DELETE(req: NextRequest) {
  const user = await requireAuth();
  if (!["admin", "system_admin", "approver"].includes(user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await req.json();
  const { personaId, targetRoleId } = body;

  if (!personaId || !targetRoleId) {
    return NextResponse.json({ error: "personaId and targetRoleId are required" }, { status: 400 });
  }

  await db.update(schema.leastAccessExceptions)
    .set({
      status: "revoked",
      revokedBy: user.username,
      revokedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(schema.leastAccessExceptions.personaId, personaId),
        eq(schema.leastAccessExceptions.targetRoleId, targetRoleId),
        eq(schema.leastAccessExceptions.status, "accepted"),
      )
    );

  return NextResponse.json({ ok: true });
}
