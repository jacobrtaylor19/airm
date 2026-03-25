import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Mappers, approvers, and admins can request risk acceptance
    if (user.role !== "mapper" && user.role !== "approver" && user.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { conflictId, justification } = await req.json();
    if (!conflictId || !justification?.trim()) {
      return NextResponse.json({ error: "conflictId and justification required" }, { status: 400 });
    }

    const conflict = db.select().from(schema.sodConflicts).where(eq(schema.sodConflicts.id, conflictId)).get();
    if (!conflict) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
    }

    if (conflict.severity === "critical") {
      return NextResponse.json({ error: "Critical severity conflicts cannot be risk-accepted. They must be resolved by fixing the mapping." }, { status: 400 });
    }

    if (conflict.resolutionStatus !== "open") {
      return NextResponse.json({ error: "Conflict is not in open status" }, { status: 400 });
    }

    // Set status to pending_risk_acceptance (requires approver review)
    db.update(schema.sodConflicts).set({
      resolutionStatus: "pending_risk_acceptance",
      resolutionNotes: justification.trim(),
    }).where(eq(schema.sodConflicts.id, conflictId)).run();

    // Audit log
    db.insert(schema.auditLog).values({
      entityType: "sodConflict",
      entityId: conflictId,
      action: "risk_acceptance_requested",
      actorEmail: user.email ?? user.username,
      oldValue: JSON.stringify({ resolutionStatus: "open" }),
      newValue: JSON.stringify({ resolutionStatus: "pending_risk_acceptance", justification: justification.trim() }),
    }).run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
