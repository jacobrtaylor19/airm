import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.role === "viewer") {
      return NextResponse.json({ error: "Insufficient permissions. Viewer role cannot approve assignments." }, { status: 403 });
    }

    // Try to parse body — may be empty for legacy bulk approve
    let body: { department?: string; assignmentIds?: number[] } = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is fine — legacy bulk approve
    }

    const { department, assignmentIds } = body;

    if (department) {
      // Department-based bulk approve
      return handleDepartmentApprove(department, user.email || user.username);
    } else if (assignmentIds && Array.isArray(assignmentIds) && assignmentIds.length > 0) {
      // ID-based bulk approve
      return handleIdsApprove(assignmentIds, user.email || user.username);
    } else {
      // Legacy: approve all high-confidence ready_for_approval
      return handleLegacyBulkApprove(user.email || user.username);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Approve all eligible assignments for a specific department */
function handleDepartmentApprove(department: string, actorEmail: string) {
  // Get all assignments for users in this department with approvable status
  const approvableStatuses = ["ready_for_approval", "compliance_approved"];

  const candidates = db
    .select({
      assignmentId: schema.userTargetRoleAssignments.id,
      userId: schema.userTargetRoleAssignments.userId,
      status: schema.userTargetRoleAssignments.status,
      sodConflictCount: schema.userTargetRoleAssignments.sodConflictCount,
      riskAcceptedBy: schema.userTargetRoleAssignments.riskAcceptedBy,
      department: schema.users.department,
    })
    .from(schema.userTargetRoleAssignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.userTargetRoleAssignments.userId))
    .where(eq(schema.users.department, department))
    .all();

  // Filter to only approvable statuses
  const eligible = candidates.filter((c) => {
    if (!approvableStatuses.includes(c.status)) return false;
    // Skip assignments with SOD conflicts unless risk has been accepted
    if ((c.sodConflictCount ?? 0) > 0 && !c.riskAcceptedBy) return false;
    return true;
  });

  // Also include sod_risk_accepted assignments
  const riskAccepted = candidates.filter((c) => c.status === "sod_risk_accepted");
  const allEligible = [...eligible, ...riskAccepted];

  const now = new Date().toISOString();
  let count = 0;

  for (const item of allEligible) {
    db.update(schema.userTargetRoleAssignments)
      .set({
        status: "approved",
        approvedBy: actorEmail,
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.userTargetRoleAssignments.id, item.assignmentId))
      .run();
    count++;
  }

  const skippedSod = candidates.filter(
    (c) => approvableStatuses.includes(c.status) && (c.sodConflictCount ?? 0) > 0 && !c.riskAcceptedBy
  ).length;

  if (count > 0) {
    db.insert(schema.auditLog).values({
      entityType: "userTargetRoleAssignment",
      entityId: 0,
      action: "bulk_approved",
      actorEmail,
      newValue: JSON.stringify({ count, department, skippedSod }),
    }).run();
  }

  return NextResponse.json({ success: true, count, skippedSod, department });
}

/** Approve specific assignment IDs */
function handleIdsApprove(assignmentIds: number[], actorEmail: string) {
  const approvableStatuses = ["ready_for_approval", "compliance_approved", "sod_risk_accepted"];
  const now = new Date().toISOString();
  let count = 0;
  let skippedSod = 0;

  for (const id of assignmentIds) {
    const assignment = db
      .select({
        id: schema.userTargetRoleAssignments.id,
        status: schema.userTargetRoleAssignments.status,
        sodConflictCount: schema.userTargetRoleAssignments.sodConflictCount,
        riskAcceptedBy: schema.userTargetRoleAssignments.riskAcceptedBy,
      })
      .from(schema.userTargetRoleAssignments)
      .where(eq(schema.userTargetRoleAssignments.id, id))
      .get();

    if (!assignment || !approvableStatuses.includes(assignment.status)) continue;

    // Skip SOD conflicts without risk acceptance
    if ((assignment.sodConflictCount ?? 0) > 0 && !assignment.riskAcceptedBy) {
      skippedSod++;
      continue;
    }

    db.update(schema.userTargetRoleAssignments)
      .set({
        status: "approved",
        approvedBy: actorEmail,
        approvedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.userTargetRoleAssignments.id, id))
      .run();
    count++;
  }

  if (count > 0) {
    db.insert(schema.auditLog).values({
      entityType: "userTargetRoleAssignment",
      entityId: 0,
      action: "bulk_approved",
      actorEmail,
      newValue: JSON.stringify({ count, assignmentIds, skippedSod }),
    }).run();
  }

  return NextResponse.json({ success: true, count, skippedSod });
}

/** Legacy: approve all ready_for_approval with high confidence */
function handleLegacyBulkApprove(actorEmail: string) {
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
  const now = new Date().toISOString();
  for (const candidate of highConfidence) {
    db.update(schema.userTargetRoleAssignments).set({
      status: "approved",
      approvedBy: actorEmail,
      approvedAt: now,
      updatedAt: now,
    }).where(eq(schema.userTargetRoleAssignments.id, candidate.assignmentId)).run();
    count++;
  }

  if (count > 0) {
    db.insert(schema.auditLog).values({
      entityType: "userTargetRoleAssignment",
      entityId: 0,
      action: "bulk_approved",
      actorEmail,
      newValue: JSON.stringify({ count, threshold: 85 }),
    }).run();
  }

  return NextResponse.json({ success: true, count });
}
