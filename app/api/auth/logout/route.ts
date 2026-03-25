import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("airm_session")?.value;
  if (token) {
    deleteSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("airm_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}
