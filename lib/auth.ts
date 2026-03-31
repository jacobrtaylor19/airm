import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AppUser {
  id: number;
  organizationId: number;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
  assignedOrgUnitId: number | null;
}

/**
 * Get the current session user by reading the Supabase JWT from cookies,
 * then looking up the corresponding appUsers row via supabaseAuthId.
 */
export async function getSessionUser(): Promise<AppUser | null> {
  try {
    const supabase = createClient();
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

    if (error || !supabaseUser) return null;

    const [appUser] = await db
      .select({
        id: schema.appUsers.id,
        organizationId: schema.appUsers.organizationId,
        username: schema.appUsers.username,
        displayName: schema.appUsers.displayName,
        email: schema.appUsers.email,
        role: schema.appUsers.role,
        assignedOrgUnitId: schema.appUsers.assignedOrgUnitId,
        isActive: schema.appUsers.isActive,
      })
      .from(schema.appUsers)
      .where(eq(schema.appUsers.supabaseAuthId, supabaseUser.id));

    if (!appUser || appUser.isActive === false) return null;

    return {
      id: appUser.id,
      organizationId: appUser.organizationId,
      username: appUser.username,
      displayName: appUser.displayName,
      email: appUser.email,
      role: appUser.role,
      assignedOrgUnitId: appUser.assignedOrgUnitId,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AppUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(allowedRoles: string[]): Promise<AppUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) redirect("/unauthorized");
  return user;
}

/** Role hierarchy: system_admin > admin > approver > coordinator > mapper > viewer */
export const ROLE_HIERARCHY: Record<string, number> = {
  system_admin: 100,
  admin: 80,
  project_manager: 70,
  approver: 60,
  coordinator: 50,
  mapper: 40,
  viewer: 20,
};

export function isSystemAdmin(user: AppUser): boolean {
  return user.role === "system_admin";
}

export function isAdminOrAbove(user: AppUser): boolean {
  return user.role === "admin" || user.role === "system_admin";
}

export async function hasAppUsers(): Promise<boolean> {
  const count = await db.select().from(schema.appUsers).limit(1);
  return count.length > 0;
}

/**
 * Look up an AppUser by explicit Supabase auth ID (for API routes that
 * already have the user from supabase.auth.getUser()).
 */
export async function getAppUserByAuthId(supabaseAuthId: string): Promise<AppUser | null> {
  const [appUser] = await db
    .select({
      id: schema.appUsers.id,
      organizationId: schema.appUsers.organizationId,
      username: schema.appUsers.username,
      displayName: schema.appUsers.displayName,
      email: schema.appUsers.email,
      role: schema.appUsers.role,
      assignedOrgUnitId: schema.appUsers.assignedOrgUnitId,
      isActive: schema.appUsers.isActive,
    })
    .from(schema.appUsers)
    .where(eq(schema.appUsers.supabaseAuthId, supabaseAuthId));

  if (!appUser || appUser.isActive === false) return null;

  return {
    id: appUser.id,
    organizationId: appUser.organizationId,
    username: appUser.username,
    displayName: appUser.displayName,
    email: appUser.email,
    role: appUser.role,
    assignedOrgUnitId: appUser.assignedOrgUnitId,
  };
}
