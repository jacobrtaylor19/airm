import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { safeError } from "@/lib/errors";
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

    await seedDatabase(db, activePack);

    return NextResponse.json({
      success: true,
      demo: activePack,
      message: `Demo environment "${activePack}" has been reset.`,
    });
  } catch (error) {
    const message = safeError(error, "Failed to reset demo environment");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
