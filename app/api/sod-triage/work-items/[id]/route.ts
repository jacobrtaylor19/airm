import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { updateWorkItemStatus } from "@/lib/queries/sod-triage";
import { reportError } from "@/lib/monitoring";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
  const { status, securityNotes } = body;

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  try {
    await updateWorkItemStatus(workItemId, status, securityNotes);
    return NextResponse.json({ ok: true });
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), { context: "work-item-update" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
