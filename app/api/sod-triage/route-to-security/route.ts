import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { createSecurityWorkItem, updateConflictResolutionStatus } from "@/lib/queries/sod-triage";
import { auditLog } from "@/lib/audit";
import { notifyUsersWithRoles } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["compliance_officer", "admin", "system_admin"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { sodConflictId, targetRoleId, complianceNotes, assignedToUserId } = body;

  if (!sodConflictId || !targetRoleId || !complianceNotes?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const orgId = getOrgId(user);

  try {
    const workItem = await createSecurityWorkItem({
      orgId,
      sodConflictId,
      targetRoleId,
      createdByUserId: user.id,
      assignedToUserId: assignedToUserId || undefined,
      complianceNotes: complianceNotes.trim(),
    });

    await updateConflictResolutionStatus(sodConflictId, "redesign_required");

    await auditLog({
      organizationId: orgId,
      entityType: "sod_conflict",
      entityId: sodConflictId,
      action: "sod_role_redesign_requested",
      actorEmail: user.email ?? user.username,
      metadata: { workItemId: workItem.id, targetRoleId },
    });

    // Notify security architects
    await notifyUsersWithRoles({
      roles: ["security_architect"],
      notificationType: "workflow_event",
      subject: "Role redesign requested",
      message: `A compliance officer has requested role redesign for a structural SOD violation. Compliance notes: ${complianceNotes.trim().slice(0, 200)}`,
      actionUrl: "/workspace/security",
    }).catch(() => {});

    return NextResponse.json({ ok: true, workItemId: workItem.id });
  } catch (err) {
    console.error("route-to-security error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
