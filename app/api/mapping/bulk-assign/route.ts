import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notifyUsersWithRoles } from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowedRoles = ["mapper", "admin", "system_admin"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Only mappers and admins can bulk assign roles" }, { status: 403 });
  }

  let body: { personaIds: number[]; targetRoleId: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { personaIds, targetRoleId } = body;

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

  // Notify approvers that new mappings are ready for review
  if (created > 0) {
    notifyUsersWithRoles({
      roles: ["approver", "admin", "system_admin"],
      notificationType: "workflow_event",
      subject: "New role mappings ready for review",
      message: `${created} new mapping(s) assigned to target role "${targetRole.roleName}". Please review in the Approvals queue.`,
      actionUrl: "/approvals",
    });
  }

  return NextResponse.json({ created, skipped, total: personaIds.length });
}
