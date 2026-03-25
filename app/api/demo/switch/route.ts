import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const VALID_DEMOS = ["default", "energy-chemicals-s4hana", "financial-services-s4hana"];

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

    // Verify the demo pack directory exists (unless it's "default" which uses data/)
    if (demo !== "default") {
      const demoDir = path.join(process.cwd(), "data", "demos", demo);
      if (!existsSync(demoDir)) {
        return NextResponse.json(
          { error: `Demo pack not found: ${demo}` },
          { status: 404 }
        );
      }
    }

    // Run the seed script with the selected demo pack
    const demoFlag = demo === "default" ? "" : `--demo=${demo}`;
    const cmd = `npx tsx db/seed.ts ${demoFlag}`.trim();

    execSync(cmd, {
      cwd: process.cwd(),
      stdio: "pipe",
      timeout: 30000,
    });

    return NextResponse.json({
      success: true,
      demo,
      message: `Successfully switched to ${demo} demo environment`,
    });
  } catch (error) {
    console.error("Demo switch error:", error);
    const message = error instanceof Error ? error.message : "Failed to switch demo environment";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
