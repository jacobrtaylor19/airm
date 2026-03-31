import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { detectIncident } from "@/lib/incidents/detection";

export const dynamic = "force-dynamic";

export async function GET() {
  let dbStatus = "disconnected";

  try {
    const result = await db.execute(sql`SELECT 1 as ok`);
    if (result && (result as unknown[]).length > 0) {
      dbStatus = "connected";
    }
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "connected" ? "ok" : "degraded";

  // Raise an incident if the health check detects degradation
  if (status === "degraded") {
    detectIncident({
      title: "Health check: database degraded",
      description: `Database connectivity check returned status "${dbStatus}". The database may be unreachable or experiencing issues.`,
      severity: "critical",
      source: "health_check",
      affectedComponent: "database",
    }).catch(() => {});
  }

  return NextResponse.json(
    {
      status,
      components: {
        database: dbStatus,
      },
      timestamp: Date.now(),
    },
    { status: status === "ok" ? 200 : 503 }
  );
}
