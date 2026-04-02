import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { safeError } from "@/lib/errors";
import { auditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const APPROVER_ROLES = ["admin", "system_admin", "project_manager"];
const VALID_CATEGORIES = ["risk", "action", "issue", "decision"];
const VALID_STATUSES = ["proposed", "approved", "in_progress", "resolved", "rejected"];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = getOrgId(user);
  const items = await db
    .select()
    .from(schema.workstreamItems)
    .where(eq(schema.workstreamItems.organizationId, orgId))
    .orderBy(desc(schema.workstreamItems.createdAt));

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === "viewer") return NextResponse.json({ error: "Viewers cannot propose items" }, { status: 403 });

  try {
    const body = await req.json();
    const { category, title, description, priority, owner, releaseId, dueDate } = body;

    if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
    if (!VALID_CATEGORIES.includes(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    if (priority && !VALID_PRIORITIES.includes(priority)) return NextResponse.json({ error: "Invalid priority" }, { status: 400 });

    const orgId = getOrgId(user);
    const [item] = await db
      .insert(schema.workstreamItems)
      .values({
        organizationId: orgId,
        releaseId: releaseId || null,
        category,
        title: title.trim(),
        description: description || null,
        status: "proposed",
        priority: priority || "medium",
        owner: owner || null,
        proposedBy: user.id,
        proposedByName: user.displayName || user.username,
        dueDate: dueDate || null,
      })
      .returning();

    auditLog({
      organizationId: orgId,
      entityType: "workstream",
      action: "item_proposed",
      actorEmail: user.email || user.username,
      metadata: { category, title: title.trim(), itemId: item.id },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err, "Failed to create item") }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, status, title, description, priority, owner, releaseId, dueDate, resolutionNotes } = body;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const orgId = getOrgId(user);

    // Fetch existing item to verify org ownership
    const [existing] = await db
      .select()
      .from(schema.workstreamItems)
      .where(and(eq(schema.workstreamItems.id, id), eq(schema.workstreamItems.organizationId, orgId)));

    if (!existing) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    // Status transitions that require PM/admin role
    const statusChangeRequiresApproval = status && ["approved", "rejected"].includes(status);
    if (statusChangeRequiresApproval && !APPROVER_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Only program managers and admins can approve or reject items" }, { status: 403 });
    }

    // Viewers can't edit
    if (user.role === "viewer") return NextResponse.json({ error: "Viewers cannot edit items" }, { status: 403 });

    // Non-approvers can only edit their own proposed items
    const isApprover = APPROVER_ROLES.includes(user.role);
    if (!isApprover && existing.proposedBy !== user.id && existing.status !== "proposed") {
      return NextResponse.json({ error: "You can only edit your own proposed items" }, { status: 403 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (priority !== undefined && VALID_PRIORITIES.includes(priority)) updates.priority = priority;
    if (owner !== undefined) updates.owner = owner;
    if (releaseId !== undefined) updates.releaseId = releaseId || null;
    if (dueDate !== undefined) updates.dueDate = dueDate || null;
    if (resolutionNotes !== undefined) updates.resolutionNotes = resolutionNotes;

    if (status && VALID_STATUSES.includes(status)) {
      updates.status = status;
      if (status === "approved" || status === "rejected") {
        updates.approvedBy = user.id;
        updates.approvedByName = user.displayName || user.username;
      }
      if (status === "resolved") {
        updates.resolvedAt = new Date().toISOString();
      }
    }

    const [updated] = await db
      .update(schema.workstreamItems)
      .set(updates)
      .where(eq(schema.workstreamItems.id, id))
      .returning();

    auditLog({
      organizationId: orgId,
      entityType: "workstream",
      action: status ? `item_${status}` : "item_updated",
      actorEmail: user.email || user.username,
      metadata: { itemId: id, category: existing.category, title: existing.title },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err, "Failed to update item") }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!APPROVER_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Only program managers and admins can delete items" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") ?? "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const orgId = getOrgId(user);
    await db
      .delete(schema.workstreamItems)
      .where(and(eq(schema.workstreamItems.id, id), eq(schema.workstreamItems.organizationId, orgId)));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err, "Failed to delete item") }, { status: 500 });
  }
}
