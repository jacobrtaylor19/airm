import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getSessionUserFromToken } from "@/lib/auth";
import { cookies } from "next/headers";

const ALLOWED_ENTITIES = {
  users: schema.users,
  personas: schema.personas,
  sourceRoles: schema.sourceRoles,
  targetRoles: schema.targetRoles,
  sodRules: schema.sodRules,
} as const;

type EntityType = keyof typeof ALLOWED_ENTITIES;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("airm_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = getSessionUserFromToken(sessionCookie.value);
  if (!user || !["admin", "system_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { entityType, ids } = body as { entityType: string; ids: number[] };

  if (!entityType || !ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "entityType and ids[] required" }, { status: 400 });
  }

  if (!(entityType in ALLOWED_ENTITIES)) {
    return NextResponse.json({ error: `Invalid entityType: ${entityType}` }, { status: 400 });
  }

  const table = ALLOWED_ENTITIES[entityType as EntityType];

  try {
    db.delete(table).where(inArray(table.id, ids)).run();

    // Log each deletion to audit log
    db.insert(schema.auditLog)
      .values({
        entityType,
        entityId: 0,
        action: "bulk_deleted",
        oldValue: JSON.stringify({ ids }),
        newValue: JSON.stringify({ count: ids.length }),
        actorEmail: user.email ?? user.username,
      })
      .run();

    return NextResponse.json({ deleted: ids.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
