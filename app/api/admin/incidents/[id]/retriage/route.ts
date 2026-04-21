import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { reportError } from "@/lib/monitoring";
import { getOrgId } from "@/lib/org-context";
import { triageIncident } from "@/lib/incidents/triage";
import { SYSTEM_ORG_ID } from "@/lib/incidents/detection";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/incidents/[id]/retriage — Re-run AI triage
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgId = getOrgId(user);
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Verify incident exists and belongs to this org
    const [incident] = await db
      .select({ id: schema.incidents.id })
      .from(schema.incidents)
      .where(
        and(
          eq(schema.incidents.id, id),
          inArray(schema.incidents.organizationId, [orgId, SYSTEM_ORG_ID]),
        ),
      );

    if (!incident) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Clear previous triage and re-run
    await db
      .update(schema.incidents)
      .set({
        aiClassification: null,
        aiTriagedAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.incidents.id, id));

    await triageIncident(id);

    // Fetch updated incident
    const [updated] = await db
      .select()
      .from(schema.incidents)
      .where(eq(schema.incidents.id, id));

    return NextResponse.json({
      success: true,
      incident: updated
        ? {
            ...updated,
            aiClassification: updated.aiClassification ? JSON.parse(updated.aiClassification) : null,
            metadata: updated.metadata ? JSON.parse(updated.metadata) : null,
          }
        : null,
    });
  } catch (err) {
    reportError(err, { route: "POST /api/admin/incidents/[id]/retriage" });
    return NextResponse.json({ error: "Failed to re-triage incident" }, { status: 500 });
  }
}
