import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { completeSecurityWorkItem } from "@/lib/queries/sod-triage";
import { auditLog } from "@/lib/audit";
import { createWorkflowNotification } from "@/lib/notifications";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["security_architect", "admin", "system_admin"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workItemId = parseInt(params.id, 10);
  if (isNaN(workItemId)) {
    return NextResponse.json({ error: "Invalid work item ID" }, { status: 400 });
  }

  const body = await req.json();
  const { securityNotes } = body;

  if (!securityNotes?.trim()) {
    return NextResponse.json({ error: "Security notes are required" }, { status: 400 });
  }

  const orgId = getOrgId(user);

  try {
    const result = await completeSecurityWorkItem(workItemId, securityNotes.trim());

    await auditLog({
      organizationId: orgId,
      entityType: "security_work_item",
      entityId: workItemId,
      action: "sod_role_redesign_complete",
      actorEmail: user.email ?? user.username,
      metadata: {
        targetRoleId: result.targetRoleId,
        roleName: result.roleName,
        affectedAssignmentCount: result.affectedAssignmentCount,
      },
    });

    // Notify the compliance officer who created the work item
    const [item] = await db
      .select({ createdByUserId: schema.securityWorkItems.createdByUserId })
      .from(schema.securityWorkItems)
      .where(eq(schema.securityWorkItems.id, workItemId));

    if (item) {
      await createWorkflowNotification({
        toUserId: item.createdByUserId,
        notificationType: "workflow_event",
        subject: `Redesign complete: ${result.roleName}`,
        message: `Role redesign is complete for ${result.roleName}. ${result.affectedAssignmentCount} assignment(s) have been returned to the re-mapping queue.`,
        actionUrl: "/workspace/compliance",
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      affectedAssignmentCount: result.affectedAssignmentCount,
      roleName: result.roleName,
    });
  } catch (err) {
    console.error("work-item complete error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
