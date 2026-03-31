import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { reportError } from "@/lib/monitoring";
import { getOrgId } from "@/lib/org-context";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/incidents/[id] — Get single incident detail
 */
export async function GET(
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

    const [incident] = await db
      .select()
      .from(schema.incidents)
      .where(
        and(
          eq(schema.incidents.id, id),
          eq(schema.incidents.organizationId, orgId),
        ),
      );

    if (!incident) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Resolve the resolver's display name if present
    let resolvedByName: string | null = null;
    if (incident.resolvedBy) {
      const [resolver] = await db
        .select({ displayName: schema.appUsers.displayName })
        .from(schema.appUsers)
        .where(eq(schema.appUsers.id, incident.resolvedBy));
      resolvedByName = resolver?.displayName ?? null;
    }

    return NextResponse.json({
      incident: {
        ...incident,
        aiClassification: incident.aiClassification ? JSON.parse(incident.aiClassification) : null,
        metadata: incident.metadata ? JSON.parse(incident.metadata) : null,
        resolvedByName,
      },
    });
  } catch (err) {
    reportError(err, { route: "GET /api/admin/incidents/[id]" });
    return NextResponse.json({ error: "Failed to fetch incident" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/incidents/[id] — Update incident status/resolution
 */
export async function PATCH(
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

    const body = await req.json();
    const { status, resolution } = body;

    const validStatuses = ["open", "investigating", "resolved", "dismissed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 },
      );
    }

    // Build update payload
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { updatedAt: now };

    if (status) updates.status = status;
    if (resolution !== undefined) updates.resolution = resolution;

    if (status === "resolved" || status === "dismissed") {
      updates.resolvedBy = user.id;
      updates.resolvedAt = now;
    }

    await db
      .update(schema.incidents)
      .set(updates)
      .where(
        and(
          eq(schema.incidents.id, id),
          eq(schema.incidents.organizationId, orgId),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (err) {
    reportError(err, { route: "PATCH /api/admin/incidents/[id]" });
    return NextResponse.json({ error: "Failed to update incident" }, { status: 500 });
  }
}
