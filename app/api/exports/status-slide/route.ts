import { NextResponse } from "next/server";
import { generateStatusSlide } from "@/lib/exports/status-slide";
import { getSessionUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    auditLog({
      organizationId: user.organizationId,
      entityType: "export",
      action: "status_slide_export",
      actorEmail: user.email || user.username,
      metadata: { format: "pptx" },
    });

    const buffer = await generateStatusSlide(user);
    const date = new Date().toISOString().split("T")[0];

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="provisum-status-${date}.pptx"`,
      },
    });
  } catch (err: unknown) {
    const message = safeError(err, "Status slide export failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
