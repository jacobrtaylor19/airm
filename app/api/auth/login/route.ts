import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyPassword, createSession } from "@/lib/auth";
import { checkLoginRate } from "@/lib/rate-limit-middleware";
import { validateBody } from "@/lib/validation";
import { loginSchema } from "@/lib/validation/auth";
import { safeError } from "@/lib/errors";
import { AUTH } from "@/lib/constants";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

function getClientIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 login attempts per 15 min per IP
  const rateLimited = checkLoginRate(req);
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();
    const ip = getClientIP(req);

    const validation = validateBody(loginSchema, body);
    if (!validation.success) return validation.response;
    const { username, password } = validation.data;

    const user = db.select().from(schema.appUsers)
      .where(and(eq(schema.appUsers.username, username), eq(schema.appUsers.isActive, true)))
      .get();

    if (!user) {
      db.insert(schema.auditLog).values({
        entityType: "auth",
        entityId: 0,
        action: "login_failure",
        newValue: JSON.stringify({ username, ip, reason: "user_not_found" }),
        actorEmail: username,
      }).run();
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Demo environment isolation
    const activePack = getSetting("active_demo_pack") || "default";
    if (user.demoEnvironment === "self-guided" && activePack !== "self-guided") {
      return NextResponse.json(
        { error: "This account is only available in the self-guided demo environment." },
        { status: 401 }
      );
    }
    if (user.demoEnvironment === null && activePack === "self-guided") {
      if (user.role !== "system_admin" && user.role !== "admin") {
        return NextResponse.json(
          { error: "Switch to the self-guided demo environment to use demo accounts." },
          { status: 401 }
        );
      }
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const unlockTime = new Date(user.lockedUntil).toISOString();
      db.insert(schema.auditLog).values({
        entityType: "auth",
        entityId: user.id,
        action: "login_locked",
        newValue: JSON.stringify({ ip, lockedUntil: unlockTime }),
        actorEmail: user.email || user.username,
      }).run();
      const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Account locked. Please try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""} or contact your administrator.` },
        { status: 429 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const updateData: { failedLoginAttempts: number; lockedUntil?: number } = {
        failedLoginAttempts: attempts,
      };

      if (attempts >= AUTH.MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = Date.now() + AUTH.LOCKOUT_DURATION_MS;
      }

      db.update(schema.appUsers)
        .set(updateData)
        .where(eq(schema.appUsers.id, user.id))
        .run();

      // Audit log failed attempt
      db.insert(schema.auditLog).values({
        entityType: "auth",
        entityId: user.id,
        action: attempts >= AUTH.MAX_LOGIN_ATTEMPTS ? "account_locked" : "login_failure",
        newValue: JSON.stringify({ ip, attempts }),
        actorEmail: user.email || user.username,
      }).run();

      if (attempts >= AUTH.MAX_LOGIN_ATTEMPTS) {
        return NextResponse.json(
          { error: "Account locked due to too many failed attempts. Please try again in 5 minutes or contact your administrator." },
          { status: 429 }
        );
      }

      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Successful login — reset lockout counters
    db.update(schema.appUsers)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(schema.appUsers.id, user.id))
      .run();

    const token = createSession(user.id);

    // Audit log successful login
    db.insert(schema.auditLog).values({
      entityType: "auth",
      entityId: user.id,
      action: "login_success",
      newValue: JSON.stringify({ ip }),
      actorEmail: user.email || user.username,
    }).run();

    const response = NextResponse.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    response.cookies.set("airm_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (err: unknown) {
    const message = safeError(err, "Login failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
