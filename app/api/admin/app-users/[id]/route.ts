import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser();
  if (!user || !["admin", "system_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const appUserId = parseInt(params.id);
  if (isNaN(appUserId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  // Change role
  if (body.role && typeof body.role === "string") {
    const validRoles = ["system_admin", "admin", "project_manager", "coordinator", "mapper", "approver", "viewer", "compliance_officer", "security_architect"];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updates.role = body.role;
  }

  // Activate/deactivate
  if (typeof body.isActive === "boolean") {
    updates.isActive = body.isActive;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
  }

  await db.update(schema.appUsers)
    .set(updates)
    .where(eq(schema.appUsers.id, appUserId));

  auditLog({
    organizationId: user.organizationId,
    entityType: "appUser",
    entityId: appUserId,
    action: "user_updated",
    actorEmail: user.email || user.username,
    metadata: updates,
  });

  return NextResponse.json({ success: true });
}
