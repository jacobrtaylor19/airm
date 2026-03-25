import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only approvers and admins can accept risk — mappers must fix mappings instead
    if (user.role !== "approver" && user.role !== "admin") {
      return NextResponse.json({ error: "Only approvers can accept SOD risk. Mappers should fix the mapping instead." }, { status: 403 });
    }

    const { conflictId, justification } = await req.json();
    if (!conflictId || !justification) {
      return NextResponse.json({ error: "conflictId and justification required" }, { status: 400 });
    }

    const conflict = db.select().from(schema.sodConflicts).where(eq(schema.sodConflicts.id, conflictId)).get();
    if (!conflict) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
    }

    if (conflict.severity === "critical") {
      return NextResponse.json({ error: "Critical severity conflicts cannot be risk-accepted. They must be resolved by fixing the mapping." }, { status: 400 });
    }

    // Update conflict resolution
    db.update(schema.sodConflicts).set({
      resolutionStatus: "risk_accepted",
      resolvedBy: user.username,
      resolvedAt: new Date().toISOString(),
      resolutionNotes: justification,
    }).where(eq(schema.sodConflicts.id, conflictId)).run();

    // Check if all conflicts for this user are resolved
    const remainingOpen = db.select().from(schema.sodConflicts)
      .where(and(
        eq(schema.sodConflicts.userId, conflict.userId),
        eq(schema.sodConflicts.resolutionStatus, "open")
      )).all();

    if (remainingOpen.length === 0) {
      // All conflicts resolved — transition user assignments to sod_risk_accepted
      db.update(schema.userTargetRoleAssignments).set({
        status: "sod_risk_accepted",
        riskAcceptedBy: "system_user",
        riskAcceptedAt: new Date().toISOString(),
        riskJustification: "All SOD conflicts resolved via risk acceptance",
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
      action: "risk_accepted",
      oldValue: JSON.stringify({ resolutionStatus: "open" }),
      newValue: JSON.stringify({ resolutionStatus: "risk_accepted", justification }),
    }).run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
