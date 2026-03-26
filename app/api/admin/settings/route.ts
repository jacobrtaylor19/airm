import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAllSettings, setSetting } from "@/lib/settings";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { validateBody } from "@/lib/validation";
import { settingsSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = getSessionUser();
  if (!user || user.role !== "system_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const settings = getAllSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const user = getSessionUser();
  if (!user || user.role !== "system_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validation = validateBody(settingsSchema, body);
    if (!validation.success) return validation.response;
    const entries = Object.entries(validation.data) as [string, string][];

    for (const [key, value] of entries) {
      setSetting(key, String(value), user.username);

      // Audit log the setting change (key only, not the value)
      db.insert(schema.auditLog)
        .values({
          entityType: "system_setting",
          entityId: 0,
          action: "setting_updated",
          oldValue: null,
          newValue: key,
          actorEmail: user.email || user.username,
        })
        .run();
    }

    return NextResponse.json({ success: true, updated: entries.length });
  } catch (err: unknown) {
    const message =
      process.env.NODE_ENV === "development" && err instanceof Error
        ? err.message
        : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
