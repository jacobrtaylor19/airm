import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrgIdForInsert } from "@/lib/org-context";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { reportError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["mapper", "admin", "system_admin"];

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { personaId: number; targetRoleId: number; accepted: boolean; aiConfidence?: number; aiReasoning?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { personaId, targetRoleId, accepted, aiConfidence, aiReasoning } = body;

  if (typeof personaId !== "number" || typeof targetRoleId !== "number" || typeof accepted !== "boolean") {
    return NextResponse.json({ error: "personaId (number), targetRoleId (number), and accepted (boolean) are required" }, { status: 400 });
  }

  try {
    const [inserted] = await db
      .insert(schema.mappingFeedback)
      .values({
        personaId,
        targetRoleId,
        accepted,
        aiConfidence: aiConfidence ?? null,
        aiReasoning: aiReasoning ?? null,
        createdBy: user.id,
        organizationId: getOrgIdForInsert(user),
      })
      .returning({ id: schema.mappingFeedback.id });

    return NextResponse.json({ id: inserted.id, ok: true });
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), { context: "feedback-save" });
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
