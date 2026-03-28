import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { safeError } from "@/lib/errors";
import { seedDatabase } from "@/db/seed";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function POST() {
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
