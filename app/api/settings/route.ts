import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProjectName, getSourceSystemName, getTargetSystemName } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Public settings endpoint — returns non-sensitive project info for any authenticated user */
export async function GET() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    projectName: getProjectName(),
    sourceSystem: getSourceSystemName(),
    targetSystem: getTargetSystemName(),
  });
}
