import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAllFeatureFlags, upsertFeatureFlag, deleteFeatureFlag } from "@/lib/feature-flags";
import { reportError } from "@/lib/monitoring";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const flags = await getAllFeatureFlags();
    return NextResponse.json({ flags });
  } catch (err) {
    reportError(err, { route: "GET /api/admin/feature-flags" });
    return NextResponse.json({ error: "Failed to fetch feature flags" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { key, description, enabled, enabledForRoles, enabledForUsers, percentage, metadata } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }
    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
    }

    await upsertFeatureFlag({
      key: key.trim().toLowerCase().replace(/\s+/g, "_"),
      description,
      enabled,
      enabledForRoles: enabledForRoles ?? null,
      enabledForUsers: enabledForUsers ?? null,
      percentage: percentage ?? null,
      metadata: metadata ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    reportError(err, { route: "POST /api/admin/feature-flags" });
    return NextResponse.json({ error: "Failed to save feature flag" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { key } = await req.json();
    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    await deleteFeatureFlag(key);
    return NextResponse.json({ success: true });
  } catch (err) {
    reportError(err, { route: "DELETE /api/admin/feature-flags" });
    return NextResponse.json({ error: "Failed to delete feature flag" }, { status: 500 });
  }
}
