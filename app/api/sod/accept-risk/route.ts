import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only approvers and admins can accept risk
    if (user.role !== "approver" && user.role !== "admin") {
      return NextResponse.json({ error: "Only approvers can accept SOD risk." }, { status: 403 });
    }

    const { conflictId, justification, action } = await req.json();
    if (!conflictId) {
      return NextResponse.json({ error: "conflictId required" }, { status: 400 });
    }

    const conflict = db.select().from(schema.sodConflicts).where(eq(schema.sodConflicts.id, conflictId)).get();
    if (!conflict) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
    }

    if (conflict.severity === "critical") {
      return NextResponse.json({ error: "Critical severity conflicts cannot be risk-accepted." }, { status: 400 });
    }

    // Handle reject action
    if (action === "reject") {
      db.update(schema.sodConflicts).set({
        resolutionStatus: "open",
        resolutionNotes: conflict.resolutionNotes
          ? `${conflict.resolutionNotes}\n\n[REJECTED by ${user.username}]: ${justification ?? "No reason provided"}`
          : `[REJECTED by ${user.username}]: ${justification ?? "No reason provided"}`,
      }).where(eq(schema.sodConflicts.id, conflictId)).run();

      db.insert(schema.auditLog).values({
        entityType: "sodConflict",
        entityId: conflictId,
        action: "risk_acceptance_rejected",
        actorEmail: user.email ?? user.username,
        oldValue: JSON.stringify({ resolutionStatus: conflict.resolutionStatus }),
        newValue: JSON.stringify({ resolutionStatus: "open" }),
      }).run();

      return NextResponse.json({ success: true, action: "rejected" });
    }

    // Default: approve risk acceptance
    const finalJustification = justification ?? conflict.resolutionNotes ?? "";

    db.update(schema.sodConflicts).set({
      resolutionStatus: "risk_accepted",
      resolvedBy: user.username,
      resolvedAt: new Date().toISOString(),
      resolutionNotes: finalJustification,
    }).where(eq(schema.sodConflicts.id, conflictId)).run();

    // Check if all conflicts for this user are resolved (not open or pending)
    const remainingUnresolved = db.select().from(schema.sodConflicts)
      .where(and(
        eq(schema.sodConflicts.userId, conflict.userId),
        inArray(schema.sodConflicts.resolutionStatus, ["open", "pending_risk_acceptance"])
      )).all();

    if (remainingUnresolved.length === 0) {
      db.update(schema.userTargetRoleAssignments).set({
        status: "sod_risk_accepted",
        riskAcceptedBy: user.username,
        riskAcceptedAt: new Date().toISOString(),
        riskJustification: "All SOD conflicts resolved via risk acceptance",
        updatedAt: new Date().toISOString(),
      }).where(and(
        eq(schema.userTargetRoleAssignments.userId, conflict.userId),
        eq(schema.userTargetRoleAssignments.status, "sod_rejected")
      )).run();
    }

    db.insert(schema.auditLog).values({
      entityType: "sodConflict",
      entityId: conflictId,
      action: "risk_accepted",
      actorEmail: user.email ?? user.username,
      oldValue: JSON.stringify({ resolutionStatus: conflict.resolutionStatus }),
      newValue: JSON.stringify({ resolutionStatus: "risk_accepted", justification: finalJustification }),
    }).run();

    return NextResponse.json({ success: true, action: "approved" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
