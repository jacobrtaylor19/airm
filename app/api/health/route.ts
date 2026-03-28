import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

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
