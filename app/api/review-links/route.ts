import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { desc } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["admin", "system_admin"];

// POST /api/review-links — create a new review link
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  await db.insert(schema.reviewLinks)
    .values({
      token,
      createdBy: user.id,
      expiresAt,
    });

  const origin = req.nextUrl.origin;
  const url = `${origin}/review/${token}`;

  return NextResponse.json({ token, url, expiresAt });
}

// GET /api/review-links — list all existing review links
export async function GET() {
  const user = await getSessionUser();
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const links = await db
    .select({
      id: schema.reviewLinks.id,
      token: schema.reviewLinks.token,
      expiresAt: schema.reviewLinks.expiresAt,
      createdAt: schema.reviewLinks.createdAt,
    })
    .from(schema.reviewLinks)
    .orderBy(desc(schema.reviewLinks.createdAt));

  return NextResponse.json({ links });
}
