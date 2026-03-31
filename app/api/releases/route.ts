import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { safeError } from "@/lib/errors";
import { getOrgId } from "@/lib/org-context";

const ADMIN_ROLES = ["admin", "system_admin"];

async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user !== null && ADMIN_ROLES.includes(user.role);
}

export const dynamic = "force-dynamic";

export async function GET() {
  const releases = await db
    .select()
    .from(schema.releases)
    .orderBy(schema.releases.createdAt);

  // Attach assignment counts per release
  const allAssignments = await db.select().from(schema.userTargetRoleAssignments);

  const releasesWithStats = releases.map((r) => {
    const assignments = allAssignments.filter((a) => a.releaseId === r.id);
    const approved = assignments.filter((a) => a.status === "approved").length;
    const pending = assignments.filter((a) => a.status === "draft" || a.status === "pending_review" || a.status === "pending_approval").length;
    const total = assignments.length;
    return { ...r, stats: { total, approved, pending } };
  });

  return NextResponse.json(releasesWithStats);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  try {
    const user = await getSessionUser();
    const body = await req.json();
    const { name, description, status, releaseType, targetSystem, targetDate, mappingDeadline, reviewDeadline, approvalDeadline, isActive } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Release name is required" }, { status: 400 });
    }

    // If setting this release as active, deactivate others first
    if (isActive) {
      await db.update(schema.releases).set({ isActive: false });
    }

    const [release] = await db
      .insert(schema.releases)
      .values({
        organizationId: user ? getOrgId(user) : 1,
        name: name.trim(),
        description: description ?? null,
        status: status ?? "planning",
        releaseType: releaseType ?? "initial",
        targetSystem: targetSystem ?? null,
        targetDate: targetDate || null,
        mappingDeadline: mappingDeadline || null,
        reviewDeadline: reviewDeadline || null,
        approvalDeadline: approvalDeadline || null,
        isActive: isActive ?? false,
        createdBy: user?.username ?? "admin",
      })
      .returning();

    return NextResponse.json(release, { status: 201 });
  } catch (err: unknown) {
    const message = safeError(err, "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  try {
    const body = await req.json();
    const { id, name, description, status, releaseType, targetSystem, targetDate, completedDate, mappingDeadline, reviewDeadline, approvalDeadline, isActive } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // If setting as active, deactivate all others first
    if (isActive) {
      await db.update(schema.releases).set({ isActive: false });
    }

    const [updated] = await db
      .update(schema.releases)
      .set({
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(releaseType !== undefined && { releaseType }),
        ...(targetSystem !== undefined && { targetSystem }),
        ...(targetDate !== undefined && { targetDate }),
        ...(completedDate !== undefined && { completedDate }),
        ...(mappingDeadline !== undefined && { mappingDeadline: mappingDeadline || null }),
        ...(reviewDeadline !== undefined && { reviewDeadline: reviewDeadline || null }),
        ...(approvalDeadline !== undefined && { approvalDeadline: approvalDeadline || null }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.releases.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = safeError(err, "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admin role required" }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Unlink assignments before deleting
    await db.update(schema.userTargetRoleAssignments)
      .set({ releaseId: null })
      .where(eq(schema.userTargetRoleAssignments.releaseId, id));

    await db.delete(schema.releases).where(eq(schema.releases.id, id));
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = safeError(err, "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
