import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { updateConflictResolutionStatus } from "@/lib/queries/sod-triage";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["compliance_officer", "admin", "system_admin"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { sodConflictId, justification, expiryDate } = body;

  if (!sodConflictId || !justification?.trim() || !expiryDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const orgId = getOrgId(user);

  try {
    await updateConflictResolutionStatus(sodConflictId, "risk_accepted");

    await auditLog({
      organizationId: orgId,
      entityType: "sod_conflict",
      entityId: sodConflictId,
      action: "sod_risk_accepted_design_level",
      actorEmail: user.email ?? user.username,
      metadata: {
        justification: justification.trim(),
        expiryDate,
        acceptedBy: user.displayName,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("accept-risk error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
