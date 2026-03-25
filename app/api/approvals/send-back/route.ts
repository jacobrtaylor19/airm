import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { assignmentId, reason } = await req.json();
    if (!assignmentId || !reason) {
      return NextResponse.json({ error: "assignmentId and reason required" }, { status: 400 });
    }

    const assignment = db.select().from(schema.userTargetRoleAssignments)
      .where(eq(schema.userTargetRoleAssignments.id, assignmentId)).get();
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    db.update(schema.userTargetRoleAssignments).set({
      status: "draft",
      sentBackReason: reason,
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.userTargetRoleAssignments.id, assignmentId)).run();

    db.insert(schema.auditLog).values({
      entityType: "userTargetRoleAssignment",
      entityId: assignmentId,
      action: "sent_back",
      oldValue: JSON.stringify({ status: assignment.status }),
      newValue: JSON.stringify({ status: "draft", reason }),
    }).run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
