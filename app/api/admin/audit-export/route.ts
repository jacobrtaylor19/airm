import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { queryAuditEntries } from "@/db/audit-db";
import { checkBulkRate } from "@/lib/rate-limit-middleware";
import { safeError } from "@/lib/errors";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const rateLimited = checkBulkRate(req, String(user.id));
  if (rateLimited) return rateLimited;

  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") || undefined;
    const actorEmail = searchParams.get("actorEmail") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const limit = parseInt(searchParams.get("limit") || "1000", 10);
    const format = searchParams.get("format") || "json";

    const entries = queryAuditEntries({
      entityType,
      actorEmail,
      fromDate,
      toDate,
      limit: Math.min(limit, 10000),
    });

    // Audit log the export itself
    auditLog({
      entityType: "audit_export",
      action: "export",
      actorEmail: user.email || user.username,
      metadata: { format, entryCount: entries.length, filters: { entityType, actorEmail, fromDate, toDate } },
    });

    if (format === "csv") {
      const header = "id,entity_type,entity_id,action,old_value,new_value,actor_email,ip_address,created_at\n";
      const rows = (entries as Record<string, unknown>[]).map((e) =>
        [e.id, e.entity_type, e.entity_id, e.action, e.old_value || "", e.new_value || "", e.actor_email || "", e.ip_address || "", e.created_at]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      ).join("\n");

      return new Response(header + rows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ entries, count: entries.length });
  } catch (err: unknown) {
    const message = safeError(err, "Failed to export audit log");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
