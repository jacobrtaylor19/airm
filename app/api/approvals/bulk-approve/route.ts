import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST() {
  try {
    // Find all assignments ready for approval where the user has high confidence (>= 85)
    const candidates = db.select({
      assignmentId: schema.userTargetRoleAssignments.id,
      userId: schema.userTargetRoleAssignments.userId,
      confidence: sql<number | null>`(
        SELECT upa.confidence_score
        FROM user_persona_assignments upa
        WHERE upa.user_id = user_target_role_assignments.user_id
        LIMIT 1
      )`,
    }).from(schema.userTargetRoleAssignments)
      .where(eq(schema.userTargetRoleAssignments.status, "ready_for_approval"))
      .all();

    const highConfidence = candidates.filter(c => c.confidence !== null && c.confidence >= 85);

    let count = 0;
    for (const candidate of highConfidence) {
      db.update(schema.userTargetRoleAssignments).set({
        status: "approved",
        approvedBy: "bulk_approve",
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).where(eq(schema.userTargetRoleAssignments.id, candidate.assignmentId)).run();
      count++;
    }

    if (count > 0) {
      db.insert(schema.auditLog).values({
        entityType: "userTargetRoleAssignment",
        entityId: 0,
        action: "bulk_approved",
        newValue: JSON.stringify({ count, threshold: 85 }),
      }).run();
    }

    return NextResponse.json({ success: true, count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
