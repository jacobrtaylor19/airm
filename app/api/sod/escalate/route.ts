import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { conflictId } = await req.json();
    if (!conflictId) {
      return NextResponse.json({ error: "conflictId required" }, { status: 400 });
    }

    const conflict = db.select().from(schema.sodConflicts).where(eq(schema.sodConflicts.id, conflictId)).get();
    if (!conflict) {
      return NextResponse.json({ error: "Conflict not found" }, { status: 404 });
    }

    db.update(schema.sodConflicts).set({
      resolutionStatus: "escalated",
      resolvedBy: "system_user",
      resolvedAt: new Date().toISOString(),
    }).where(eq(schema.sodConflicts.id, conflictId)).run();

    db.insert(schema.auditLog).values({
      entityType: "sodConflict",
      entityId: conflictId,
      action: "escalated",
      oldValue: JSON.stringify({ resolutionStatus: conflict.resolutionStatus }),
      newValue: JSON.stringify({ resolutionStatus: "escalated" }),
    }).run();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
