import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    if (!["admin", "system_admin", "security_architect"].includes(user.role)) {
      return NextResponse.json({ error: "Only security architects and admins can reject roles" }, { status: 403 });
    }

    const orgId = getOrgId(user);
    const roleId = parseInt(params.id, 10);
    const { reason } = await req.json().catch(() => ({ reason: "" }));

    const [role] = await db
      .select()
      .from(schema.targetRoles)
      .where(and(eq(schema.targetRoles.id, roleId), eq(schema.targetRoles.organizationId, orgId)));

    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

    // Keep as draft — rejection just logs the event
    await db.update(schema.targetRoles).set({
      updatedAt: new Date().toISOString(),
      updatedBy: user.id,
    }).where(eq(schema.targetRoles.id, roleId));

    await auditLog({
      organizationId: orgId,
      entityType: "target_role",
      entityId: roleId,
      action: "role.rejected",
      actorEmail: user.email ?? user.username,
      oldValue: JSON.stringify({ status: role.status }),
      newValue: JSON.stringify({ status: "draft", rejectionReason: reason }),
      metadata: { reason },
    });

    return NextResponse.json({ success: true, reason });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err) }, { status: 500 });
  }
}
