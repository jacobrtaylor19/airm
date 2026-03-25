import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only mappers (and admins) can fix mappings
    if (user.role !== "mapper" && user.role !== "admin") {
      return NextResponse.json({ error: "Only mappers can fix mappings" }, { status: 403 });
    }

    const { conflictId, removeRoleId } = await req.json();
    if (!conflictId || !removeRoleId) {
      return NextResponse.json({ error: "conflictId and removeRoleId required" }, { status: 400 });
    }

    const conflict = db.select().from(schema.sodConflicts).where(eq(schema.sodConflicts.id, conflictId)).get();
    if (!conflict) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
    }

    if (conflict.resolutionStatus !== "open") {
      return NextResponse.json({ error: "Conflict is already resolved" }, { status: 400 });
    }

    // Validate the removeRoleId is one of the conflicting roles
    if (conflict.roleIdA !== removeRoleId && conflict.roleIdB !== removeRoleId) {
      return NextResponse.json({ error: "removeRoleId must be one of the conflicting roles" }, { status: 400 });
    }

    // Remove the target role assignment for this user
    const deleted = db.delete(schema.userTargetRoleAssignments)
      .where(and(
        eq(schema.userTargetRoleAssignments.userId, conflict.userId),
        eq(schema.userTargetRoleAssignments.targetRoleId, removeRoleId),
      ))
      .returning()
      .all();

    // Mark the SOD conflict as resolved
    db.update(schema.sodConflicts).set({
      resolutionStatus: "mapping_fixed",
      resolvedBy: user.username,
      resolvedAt: new Date().toISOString(),
      resolutionNotes: `Removed target role assignment (roleId=${removeRoleId}) to resolve conflict`,
    }).where(eq(schema.sodConflicts.id, conflictId)).run();

    // Check if all conflicts for this user are now resolved
    const remainingOpen = db.select().from(schema.sodConflicts)
      .where(and(
        eq(schema.sodConflicts.userId, conflict.userId),
        eq(schema.sodConflicts.resolutionStatus, "open")
      )).all();

    if (remainingOpen.length === 0) {
      // All conflicts resolved — transition sod_rejected assignments back to ready_for_approval
      db.update(schema.userTargetRoleAssignments).set({
        status: "ready_for_approval",
        updatedAt: new Date().toISOString(),
      }).where(and(
        eq(schema.userTargetRoleAssignments.userId, conflict.userId),
        eq(schema.userTargetRoleAssignments.status, "sod_rejected")
      )).run();
    }

    // Audit log
    db.insert(schema.auditLog).values({
      entityType: "sodConflict",
      entityId: conflictId,
      action: "mapping_fixed",
      actorEmail: user.email ?? user.username,
      oldValue: JSON.stringify({ resolutionStatus: "open" }),
      newValue: JSON.stringify({
        resolutionStatus: "mapping_fixed",
        removedRoleId: removeRoleId,
        removedAssignments: deleted.length,
      }),
    }).run();

    return NextResponse.json({ success: true, removedAssignments: deleted.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
