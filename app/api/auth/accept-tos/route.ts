import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { withRateLimit } from "@/lib/rate-limit-response";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-memory";

const CURRENT_TOS_VERSION = "2026-04-05";

export async function POST(req: NextRequest) {
  const limited = withRateLimit(req, RATE_LIMIT_PRESETS.AUTH);
  if (limited) return limited;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db
    .update(schema.appUsers)
    .set({
      tosAcceptedAt: new Date().toISOString(),
      tosVersion: CURRENT_TOS_VERSION,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.appUsers.id, user.id));

  return NextResponse.json({ accepted: true, version: CURRENT_TOS_VERSION });
}
