import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!getSessionUser()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { releaseId } = await req.json();
  const res = NextResponse.json({ success: true });

  if (releaseId) {
    res.cookies.set("airm_release_id", String(releaseId), {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } else {
    res.cookies.delete("airm_release_id");
  }

  return res;
}
