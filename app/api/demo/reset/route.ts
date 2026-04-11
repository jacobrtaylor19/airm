import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { seedDatabase } from "@/db/seed";
import { db } from "@/db";
import { isProduction } from "@/lib/env";
import { reportError, reportMessage } from "@/lib/monitoring";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST() {
  if (isProduction()) {
    return NextResponse.json({ error: "Demo reset is disabled in production" }, { status: 403 });
  }

  const user = await getSessionUser();
  if (!user || (user.role !== "system_admin" && user.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const activePack = await getSetting("active_demo_pack") || "default";

    reportMessage(`[demo-reset] Starting reset with pack: ${activePack}`, "info");
    reportMessage(`[demo-reset] cwd: ${process.cwd()}`, "info");

    await seedDatabase(db, activePack);

    reportMessage("[demo-reset] Reset complete", "info");

    return NextResponse.json({
      success: true,
      demo: activePack,
      message: `Demo environment "${activePack}" has been reset.`,
    });
  } catch (error) {
    reportError(error instanceof Error ? error : new Error(String(error)), { context: "demo-reset" });
    
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to reset demo environment", detail }, { status: 500 });
  }
}
