import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { seedDatabase } from "@/db/seed";
import { db } from "@/db";
import { isProduction } from "@/lib/env";

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

    console.log(`[demo-reset] Starting reset with pack: ${activePack}`);
    console.log(`[demo-reset] cwd: ${process.cwd()}`);

    await seedDatabase(db, activePack);

    console.log(`[demo-reset] Reset complete`);

    return NextResponse.json({
      success: true,
      demo: activePack,
      message: `Demo environment "${activePack}" has been reset.`,
    });
  } catch (error) {
    console.error("[demo-reset] Failed:", error instanceof Error ? error.message : error);
    console.error("[demo-reset] Stack:", error instanceof Error ? error.stack : "no stack");
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to reset demo environment", detail }, { status: 500 });
  }
}
