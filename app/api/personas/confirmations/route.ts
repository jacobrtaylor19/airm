import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const confirmations = db
    .select({
      id: schema.personaConfirmations.id,
      orgUnitId: schema.personaConfirmations.orgUnitId,
      confirmedAt: schema.personaConfirmations.confirmedAt,
      confirmedBy: schema.personaConfirmations.confirmedBy,
      resetAt: schema.personaConfirmations.resetAt,
      resetBy: schema.personaConfirmations.resetBy,
    })
    .from(schema.personaConfirmations)
    .all();

  // Enrich with org unit names and confirmer display names
  const orgUnits = db
    .select({ id: schema.orgUnits.id, name: schema.orgUnits.name })
    .from(schema.orgUnits)
    .all();
  const appUserRows = db
    .select({ id: schema.appUsers.id, displayName: schema.appUsers.displayName })
    .from(schema.appUsers)
    .all();

  const orgUnitMap = new Map(orgUnits.map((o) => [o.id, o.name]));
  const userMap = new Map(appUserRows.map((u) => [u.id, u.displayName]));

  const enriched = confirmations.map((c) => ({
    ...c,
    orgUnitName: orgUnitMap.get(c.orgUnitId) ?? "Unknown",
    confirmerName: c.confirmedBy ? userMap.get(c.confirmedBy) ?? "Unknown" : null,
    resetByName: c.resetBy ? userMap.get(c.resetBy) ?? "Unknown" : null,
    isActive: c.resetAt === null,
  }));

  return NextResponse.json({ confirmations: enriched });
}
