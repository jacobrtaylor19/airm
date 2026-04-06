import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { reportError } from "@/lib/monitoring";
import { getOrgId } from "@/lib/org-context";
import { detectIncident } from "@/lib/incidents/detection";
import { parseBody } from "@/lib/api-validation";
import { incidentCreateSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/incidents — List incidents with optional filters
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status"); // open, investigating, resolved, dismissed
    const severity = url.searchParams.get("severity"); // critical, high, medium, low
    const from = url.searchParams.get("from"); // ISO date
    const to = url.searchParams.get("to"); // ISO date
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);

    const orgId = getOrgId(user);
    const conditions = [eq(schema.incidents.organizationId, orgId)];

    if (status) conditions.push(eq(schema.incidents.status, status));
    if (severity) conditions.push(eq(schema.incidents.severity, severity));
    if (from) conditions.push(gte(schema.incidents.createdAt, from));
    if (to) conditions.push(lte(schema.incidents.createdAt, to));

    const incidents = await db
      .select()
      .from(schema.incidents)
      .where(and(...conditions))
      .orderBy(desc(schema.incidents.createdAt))
      .limit(limit);

    // Parse JSON fields for API consumers
    const parsed = incidents.map((inc) => ({
      ...inc,
      aiClassification: inc.aiClassification ? JSON.parse(inc.aiClassification) : null,
      metadata: inc.metadata ? JSON.parse(inc.metadata) : null,
    }));

    return NextResponse.json({ incidents: parsed });
  } catch (err) {
    reportError(err, { route: "GET /api/admin/incidents" });
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 });
  }
}

/**
 * POST /api/admin/incidents — Create a manual incident
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await parseBody(req, incidentCreateSchema);
    if ("error" in result) return result.error;
    const { title, description, severity, affectedComponent, metadata } = result.data;

    const orgId = getOrgId(user);
    const incidentId = await detectIncident({
      title,
      description,
      severity,
      source: "manual",
      affectedComponent: affectedComponent ?? undefined,
      metadata: metadata ?? undefined,
      organizationId: orgId,
    });

    return NextResponse.json({ id: incidentId, success: true });
  } catch (err) {
    reportError(err, { route: "POST /api/admin/incidents" });
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
  }
}
