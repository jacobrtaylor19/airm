import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAdapter } from "@/lib/adapters";
import { getSetting } from "@/lib/settings";
import { reportError } from "@/lib/monitoring";

export async function POST() {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adapterType = (await getSetting("target_system_adapter")) ?? "mock";
    const adapter = getAdapter(adapterType);
    const result = await adapter.testConnection();

    return NextResponse.json({
      adapterName: adapter.name,
      adapterType: adapter.type,
      ...result,
    });
  } catch (err) {
    reportError(err, { route: "POST /api/admin/security-design/test-connection" });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Connection test failed" },
      { status: 500 }
    );
  }
}
