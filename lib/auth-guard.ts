import { NextResponse } from "next/server";
import { getSessionUser, AppUser } from "@/lib/auth";

/**
 * Get the authenticated user or return a 401 response.
 * Usage: const { user, error } = await requireAuthGuard(); if (error) return error;
 */
export async function requireAuthGuard(): Promise<{ user: AppUser; error?: never } | { user?: never; error: NextResponse }> {
  const user = await getSessionUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user };
}

/**
 * Get the authenticated user and verify they have one of the allowed roles.
 * Returns 401 if not authenticated, 403 if wrong role.
 */
export async function requireRoleGuard(allowedRoles: string[]): Promise<{ user: AppUser; error?: never } | { user?: never; error: NextResponse }> {
  const result = await requireAuthGuard();
  if (result.error) return result;
  if (!allowedRoles.includes(result.user.role)) {
    return { error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }
  return { user: result.user };
}
