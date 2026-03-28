import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { MAPPER_ROLES } from "@/lib/constants";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !MAPPER_ROLES.includes(user.role as (typeof MAPPER_ROLES)[number])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { assignmentIds, all } = body as { assignmentIds?: number[]; all?: boolean };

    if (!all && (!assignmentIds || !Array.isArray(assignmentIds) || assignmentIds.length === 0)) {
      return NextResponse.json(
        { error: "Provide assignmentIds array or { all: true }" },
        { status: 400 }
      );
    }

    // Get user's scope for filtering
    const scopedUserIds = await getUserScope(user);

    let draftAssignments;
    if (all) {
      // Submit all draft assignments in scope
      if (scopedUserIds) {
        draftAssignments = await db
          .select({ id: schema.userTargetRoleAssignments.id })
          .from(schema.userTargetRoleAssignments)
          .where(
            and(
              eq(schema.userTargetRoleAssignments.status, "draft"),
              inArray(schema.userTargetRoleAssignments.userId, scopedUserIds)
            )
          );
      } else {
        // No scope restriction (admin/system_admin)
        draftAssignments = await db
          .select({ id: schema.userTargetRoleAssignments.id })
          .from(schema.userTargetRoleAssignments)
          .where(eq(schema.userTargetRoleAssignments.status, "draft"));
      }
    } else {
      // Submit specific assignments — verify they are draft and in scope
      draftAssignments = await db
        .select({
          id: schema.userTargetRoleAssignments.id,
          userId: schema.userTargetRoleAssignments.userId,
        })
        .from(schema.userTargetRoleAssignments)
        .where(
          and(
            inArray(schema.userTargetRoleAssignments.id, assignmentIds!),
            eq(schema.userTargetRoleAssignments.status, "draft")
          )
        );

      // Scope check for non-admin users
      if (scopedUserIds) {
        draftAssignments = draftAssignments.filter((a) =>
          scopedUserIds.includes(a.userId)
        );
      }
    }

    if (draftAssignments.length === 0) {
      return NextResponse.json(
        { error: "No draft assignments found to submit" },
        { status: 400 }
      );
    }

    const ids = draftAssignments.map((a) => a.id);
    const now = new Date().toISOString();

    // Batch update in chunks of 500
    for (let i = 0; i < ids.length; i += 500) {
      const batch = ids.slice(i, i + 500);
      await db.update(schema.userTargetRoleAssignments)
        .set({ status: "pending_review", updatedAt: now })
        .where(inArray(schema.userTargetRoleAssignments.id, batch));
    }

    await auditLog({
      entityType: "mapping",
      action: "submit_for_review",
      actorEmail: user.email ?? user.username,
      actorRole: user.role,
      metadata: { count: ids.length, all: !!all },
    });

    return NextResponse.json({
      success: true,
      updated: ids.length,
      message: `${ids.length} assignment${ids.length === 1 ? "" : "s"} submitted for review`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: safeError(error, "Failed to submit assignments for review") },
      { status: 500 }
    );
  }
}
