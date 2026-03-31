import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sql, and, count } from "drizzle-orm";
import { orgScope } from "@/lib/org-context";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !["system_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = getOrgId(user);
  const last24h = sql`${schema.auditLog.createdAt} > (now() - interval '24 hours')::text`;
  const last7d = sql`${schema.auditLog.createdAt} > (now() - interval '7 days')::text`;

  const [
    actions24h,
    actions7d,
    actionsByType24h,
    recentActions,
  ] = await Promise.all([
    // Total actions in last 24h
    db.select({ count: count() })
      .from(schema.auditLog)
      .where(and(orgScope(schema.auditLog.organizationId, orgId), last24h)),

    // Total actions in last 7d
    db.select({ count: count() })
      .from(schema.auditLog)
      .where(and(orgScope(schema.auditLog.organizationId, orgId), last7d)),

    // Breakdown by action type (last 24h)
    db.select({
      action: schema.auditLog.action,
      count: count(),
    })
      .from(schema.auditLog)
      .where(and(orgScope(schema.auditLog.organizationId, orgId), last24h))
      .groupBy(schema.auditLog.action)
      .orderBy(sql`count(*) desc`)
      .limit(8),

    // Most recent 5 actions
    db.select({
      action: schema.auditLog.action,
      entityType: schema.auditLog.entityType,
      actorEmail: schema.auditLog.actorEmail,
      createdAt: schema.auditLog.createdAt,
    })
      .from(schema.auditLog)
      .where(orgScope(schema.auditLog.organizationId, orgId))
      .orderBy(sql`${schema.auditLog.createdAt} desc`)
      .limit(5),
  ]);

  return NextResponse.json({
    last24h: actions24h[0]!.count,
    last7d: actions7d[0]!.count,
    actionsByType: actionsByType24h.map(r => ({
      action: r.action,
      count: r.count,
    })),
    recentActions: recentActions.map(r => ({
      action: r.action,
      entityType: r.entityType,
      actor: r.actorEmail,
      at: r.createdAt,
    })),
  });
}
