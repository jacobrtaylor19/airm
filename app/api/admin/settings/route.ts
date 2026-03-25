import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAllSettings, setSetting } from "@/lib/settings";

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
    const entries = Object.entries(body) as [string, string][];

    for (const [key, value] of entries) {
      setSetting(key, String(value), user.username);
    }

    return NextResponse.json({ success: true, updated: entries.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
