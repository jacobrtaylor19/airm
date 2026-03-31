import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getOrgId, orgScope } from "@/lib/org-context";
import { reportError } from "@/lib/monitoring";

/**
 * GET — List security design changes, optionally filtered by status.
 * Query params: ?status=pending (default shows all)
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgId = getOrgId(user);
    const statusFilter = req.nextUrl.searchParams.get("status");

    const conditions = [
      orgScope(schema.securityDesignChanges.organizationId, orgId),
    ];
    if (statusFilter) {
      conditions.push(eq(schema.securityDesignChanges.status, statusFilter));
    }

    const changes = await db
      .select({
        id: schema.securityDesignChanges.id,
        changeType: schema.securityDesignChanges.changeType,
        roleName: schema.securityDesignChanges.roleName,
        roleExternalId: schema.securityDesignChanges.roleExternalId,
        detail: schema.securityDesignChanges.detail,
        status: schema.securityDesignChanges.status,
        detectedAt: schema.securityDesignChanges.detectedAt,
        detectedBy: schema.securityDesignChanges.detectedBy,
        reviewedAt: schema.securityDesignChanges.reviewedAt,
        acknowledgedBy: schema.securityDesignChanges.acknowledgedBy,
      })
      .from(schema.securityDesignChanges)
      .where(and(...conditions))
      .orderBy(desc(schema.securityDesignChanges.detectedAt));

    return NextResponse.json({ changes });
  } catch (err) {
    reportError(err, { route: "GET /api/admin/security-design/changes" });
    return NextResponse.json(
      { error: "Failed to fetch changes" },
      { status: 500 }
    );
  }
}

/**
 * POST — Accept or dismiss one or more changes.
 * Body: { ids: number[], action: "accept" | "dismiss" }
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { ids, action } = body as { ids: number[]; action: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }
    if (!["accept", "dismiss"].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "accept" or "dismiss"' },
        { status: 400 }
      );
    }

    const newStatus = action === "accept" ? "accepted" : "dismissed";
    const now = new Date().toISOString();

    // Update each change individually (drizzle doesn't support inArray on serial PKs well with batch)
    let updated = 0;
    for (const id of ids) {
      await db
        .update(schema.securityDesignChanges)
        .set({
          status: newStatus,
          acknowledgedBy: user.username,
          acknowledgedAt: now,
          reviewedBy: user.id,
          reviewedAt: now,
        })
        .where(
          and(
            eq(schema.securityDesignChanges.id, id),
            eq(schema.securityDesignChanges.status, "pending")
          )
        );
      updated++;
    }

    return NextResponse.json({ success: true, updated, status: newStatus });
  } catch (err) {
    reportError(err, { route: "POST /api/admin/security-design/changes" });
    return NextResponse.json(
      { error: "Failed to update changes" },
      { status: 500 }
    );
  }
}
