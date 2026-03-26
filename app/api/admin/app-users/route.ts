import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "system_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = db.select({
    id: schema.appUsers.id,
    username: schema.appUsers.username,
    displayName: schema.appUsers.displayName,
    email: schema.appUsers.email,
    role: schema.appUsers.role,
    isActive: schema.appUsers.isActive,
    createdAt: schema.appUsers.createdAt,
  }).from(schema.appUsers).all();

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "system_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { username, displayName, email, password, role } = await req.json();
    if (!username || !displayName || !password || !role) {
      return NextResponse.json({ error: "Username, display name, password, and role required" }, { status: 400 });
    }

    const existing = db.select().from(schema.appUsers).where(eq(schema.appUsers.username, username)).get();
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const created = db.insert(schema.appUsers).values({
      username,
      displayName,
      email: email || null,
      passwordHash,
      role,
    }).returning().get();

    db.insert(schema.auditLog).values({
      entityType: "appUser",
      entityId: created.id,
      action: "created",
      newValue: JSON.stringify({ username, role }),
      actorEmail: user.username,
    }).run();

    return NextResponse.json({ success: true, id: created.id });
  } catch (err: unknown) {
    const message = safeError(err, "Failed to create user");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
