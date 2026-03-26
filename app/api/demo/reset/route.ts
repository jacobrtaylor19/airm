import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { getSessionUser } from "@/lib/auth";
import { getSetting } from "@/lib/settings";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = getSessionUser();
  if (!user || (user.role !== "system_admin" && user.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const activePack = getSetting("active_demo_pack") || "default";

    const cmd = `npx tsx db/seed.ts --demo=${activePack}`;
    execSync(cmd, {
      cwd: process.cwd(),
      stdio: "pipe",
      timeout: 60000,
    });

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
