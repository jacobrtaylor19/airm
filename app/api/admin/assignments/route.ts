import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const assignments = db.select({
    id: schema.workAssignments.id,
    appUserId: schema.workAssignments.appUserId,
    appUserName: schema.appUsers.displayName,
    appUserRole: schema.appUsers.role,
    assignmentType: schema.workAssignments.assignmentType,
    scopeType: schema.workAssignments.scopeType,
    scopeValue: schema.workAssignments.scopeValue,
    createdAt: schema.workAssignments.createdAt,
  })
    .from(schema.workAssignments)
    .innerJoin(schema.appUsers, eq(schema.appUsers.id, schema.workAssignments.appUserId))
    .all();

  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { appUserId, assignmentType, scopeType, scopeValue } = await req.json();
    if (!appUserId || !assignmentType || !scopeType || !scopeValue) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    const created = db.insert(schema.workAssignments).values({
      appUserId,
      assignmentType,
      scopeType,
      scopeValue,
    }).returning().get();

    db.insert(schema.auditLog).values({
      entityType: "workAssignment",
      entityId: created.id,
      action: "created",
      newValue: JSON.stringify({ appUserId, assignmentType, scopeType, scopeValue }),
      actorEmail: user.username,
    }).run();

    return NextResponse.json({ success: true, id: created.id });
  } catch (err: unknown) {
    const message = safeError(err, "Failed to create assignment");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Assignment ID required" }, { status: 400 });
  }

  db.delete(schema.workAssignments).where(eq(schema.workAssignments.id, Number(id))).run();

  db.insert(schema.auditLog).values({
    entityType: "workAssignment",
    entityId: Number(id),
    action: "deleted",
    actorEmail: user.username,
  }).run();

  return NextResponse.json({ success: true });
}
