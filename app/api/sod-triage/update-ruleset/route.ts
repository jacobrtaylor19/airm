import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { updateConflictResolutionStatus } from "@/lib/queries/sod-triage";
import { auditLog } from "@/lib/audit";
import { reportError } from "@/lib/monitoring";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["compliance_officer", "admin", "system_admin"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { sodConflictId, sodRuleId, justification } = body;

  if (!sodConflictId || !sodRuleId || !justification?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const orgId = getOrgId(user);

  try {
    // Deactivate the SOD rule
    await db
      .update(schema.sodRules)
      .set({ isActive: false })
      .where(eq(schema.sodRules.id, sodRuleId));

    // Update conflict resolution status
    await updateConflictResolutionStatus(sodConflictId, "ruleset_updated");

    await auditLog({
      organizationId: orgId,
      entityType: "sod_rule",
      entityId: sodRuleId,
      action: "sod_ruleset_updated",
      actorEmail: user.email ?? user.username,
      metadata: { sodConflictId, justification: justification.trim() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), { context: "update-ruleset" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
