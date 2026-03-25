import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const COOKIE_NAME = "airm_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AppUser {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSession(appUserId: number): string {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

  // Clean up expired sessions for this user
  db.delete(schema.appUserSessions)
    .where(eq(schema.appUserSessions.appUserId, appUserId))
    .run();

  db.insert(schema.appUserSessions).values({
    sessionToken: token,
    appUserId,
    expiresAt,
  }).run();

  return token;
}

export function deleteSession(token: string): void {
  db.delete(schema.appUserSessions)
    .where(eq(schema.appUserSessions.sessionToken, token))
    .run();
}

export function getSessionUser(): AppUser | null {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  const session = db.select({
    id: schema.appUsers.id,
    username: schema.appUsers.username,
    displayName: schema.appUsers.displayName,
    email: schema.appUsers.email,
    role: schema.appUsers.role,
    expiresAt: schema.appUserSessions.expiresAt,
  })
    .from(schema.appUserSessions)
    .innerJoin(schema.appUsers, eq(schema.appUsers.id, schema.appUserSessions.appUserId))
    .where(eq(schema.appUserSessions.sessionToken, sessionCookie.value))
    .get();

  if (!session) return null;

  // Check expiry
  if (new Date(session.expiresAt) < new Date()) {
    deleteSession(sessionCookie.value);
    return null;
  }

  return {
    id: session.id,
    username: session.username,
    displayName: session.displayName,
    email: session.email,
    role: session.role,
  };
}

export function requireAuth(): AppUser {
  const user = getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export function requireRole(allowedRoles: string[]): AppUser {
  const user = requireAuth();
  if (!allowedRoles.includes(user.role)) redirect("/unauthorized");
  return user;
}

/** Role hierarchy: system_admin > admin > approver > mapper > viewer */
export const ROLE_HIERARCHY: Record<string, number> = {
  system_admin: 100,
  admin: 80,
  approver: 60,
  mapper: 40,
  viewer: 20,
};

export function isSystemAdmin(user: AppUser): boolean {
  return user.role === "system_admin";
}

export function isAdminOrAbove(user: AppUser): boolean {
  return user.role === "admin" || user.role === "system_admin";
}

export function hasAppUsers(): boolean {
  const count = db.select().from(schema.appUsers).limit(1).all();
  return count.length > 0;
}

export function getSessionUserFromToken(token: string): AppUser | null {
  const session = db.select({
    id: schema.appUsers.id,
    username: schema.appUsers.username,
    displayName: schema.appUsers.displayName,
    email: schema.appUsers.email,
    role: schema.appUsers.role,
    expiresAt: schema.appUserSessions.expiresAt,
  })
    .from(schema.appUserSessions)
    .innerJoin(schema.appUsers, eq(schema.appUsers.id, schema.appUserSessions.appUserId))
    .where(eq(schema.appUserSessions.sessionToken, token))
    .get();

  if (!session || new Date(session.expiresAt) < new Date()) return null;

  return {
    id: session.id,
    username: session.username,
    displayName: session.displayName,
    email: session.email,
    role: session.role,
  };
}
