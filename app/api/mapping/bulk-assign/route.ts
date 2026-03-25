import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role === "viewer") {
    return NextResponse.json({ error: "Viewers cannot assign roles" }, { status: 403 });
  }

  const body = await req.json();
  const { personaIds, targetRoleId } = body as { personaIds: number[]; targetRoleId: number };

  if (!Array.isArray(personaIds) || personaIds.length === 0 || !targetRoleId) {
    return NextResponse.json({ error: "personaIds (array) and targetRoleId are required" }, { status: 400 });
  }

  // Verify target role exists
  const targetRole = db.select().from(schema.targetRoles).where(eq(schema.targetRoles.id, targetRoleId)).get();
  if (!targetRole) {
    return NextResponse.json({ error: "Target role not found" }, { status: 404 });
  }

  let created = 0;
  let skipped = 0;

  for (const personaId of personaIds) {
    // Check if mapping already exists
    const existing = db
      .select()
      .from(schema.personaTargetRoleMappings)
      .where(
        and(
          eq(schema.personaTargetRoleMappings.personaId, personaId),
          eq(schema.personaTargetRoleMappings.targetRoleId, targetRoleId)
        )
      )
      .get();

    if (existing) {
      skipped++;
      continue;
    }

    db.insert(schema.personaTargetRoleMappings)
      .values({
        personaId,
        targetRoleId,
        mappingReason: "Bulk manual assignment",
        confidence: "high",
      })
      .run();
    created++;
  }

  return NextResponse.json({ created, skipped, total: personaIds.length });
}
