import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { setSetting } from "@/lib/settings";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const VALID_DEMOS = [
  "default",
  "energy-chemicals-s4hana",
  "empty-project",
  "self-guided",
  "financial-services-s4hana",
  "consumer-products-s4hana",
  "manufacturing-s4hana",
  "oracle-fusion",
  "workday",
  "salesforce",
  "servicenow",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { demo } = body;

    if (!demo || !VALID_DEMOS.includes(demo)) {
      return NextResponse.json(
        { error: `Invalid demo environment. Valid options: ${VALID_DEMOS.join(", ")}` },
        { status: 400 }
      );
    }

    const demoDir = path.join(process.cwd(), "data", "demos", demo);
    if (!existsSync(demoDir)) {
      return NextResponse.json(
        { error: `Demo pack not found: ${demo}` },
        { status: 404 }
      );
    }

    // Use pnpm db:seed for reliability — npx tsx may not resolve on Render
    const cmd = demo === "default"
      ? "pnpm db:seed"
      : `pnpm db:seed -- --demo=${demo}`;
    execSync(cmd, {
      cwd: process.cwd(),
      stdio: "pipe",
      timeout: 120000, // 2 min — bcrypt hashing for accounts takes time
    });

    // Persist the active demo pack so login isolation can check it
    setSetting("active_demo_pack", demo, "system");

    return NextResponse.json({
      success: true,
      demo,
      message: `Successfully switched to ${demo} demo environment`,
    });
  } catch (error) {
    const message = safeError(error, "Failed to switch demo environment");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
