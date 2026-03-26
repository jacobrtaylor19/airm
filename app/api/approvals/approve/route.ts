import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { assignmentId } = await req.json();
    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId required" }, { status: 400 });
    }

    const assignment = db.select().from(schema.userTargetRoleAssignments)
      .where(eq(schema.userTargetRoleAssignments.id, assignmentId)).get();
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    if (assignment.status !== "ready_for_approval") {
      return NextResponse.json({ error: `Cannot approve — status is ${assignment.status}, must be ready_for_approval` }, { status: 400 });
    }

    db.update(schema.userTargetRoleAssignments).set({
      status: "approved",
      approvedBy: "system_user",
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.userTargetRoleAssignments.id, assignmentId)).run();

    db.insert(schema.auditLog).values({
      entityType: "userTargetRoleAssignment",
      entityId: assignmentId,
      action: "approved",
      oldValue: JSON.stringify({ status: "ready_for_approval" }),
      newValue: JSON.stringify({ status: "approved" }),
    }).run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = safeError(err, "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
