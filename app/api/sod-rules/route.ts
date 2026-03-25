import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Check if the user can edit SOD rules: admin, system_admin, or role containing "compliance" or "security" */
function canEditSodRules(role: string): boolean {
  if (["admin", "system_admin"].includes(role)) return true;
  const lower = role.toLowerCase();
  return lower.includes("compliance") || lower.includes("security");
}

// POST — create or update a SOD rule
export async function POST(request: NextRequest) {
  const user = getSessionUser();
  if (!user || !canEditSodRules(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, ruleId, ruleName, permissionA, permissionB, severity, riskDescription, isActive } = body;

  if (!ruleId || !ruleName || !permissionA || !permissionB || !severity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validSeverities = ["critical", "high", "medium", "low"];
  if (!validSeverities.includes(severity)) {
    return NextResponse.json({ error: `Invalid severity. Must be: ${validSeverities.join(", ")}` }, { status: 400 });
  }

  try {
    if (id) {
      // Update existing rule
      db.update(schema.sodRules)
        .set({
          ruleId,
          ruleName,
          permissionA,
          permissionB,
          severity,
          riskDescription: riskDescription || null,
          isActive: isActive !== false,
        })
        .where(eq(schema.sodRules.id, id))
        .run();

      // Audit log
      db.insert(schema.auditLog).values({
        entityType: "sodRule",
        entityId: id,
        action: "updated",
        actorEmail: user.email || user.username,
        newValue: JSON.stringify({ ruleId, ruleName, severity, isActive }),
      }).run();

      return NextResponse.json({ success: true, action: "updated" });
    } else {
      // Create new rule
      const result = db.insert(schema.sodRules).values({
        ruleId,
        ruleName,
        permissionA,
        permissionB,
        severity,
        riskDescription: riskDescription || null,
        isActive: isActive !== false,
      }).run();

      db.insert(schema.auditLog).values({
        entityType: "sodRule",
        entityId: Number(result.lastInsertRowid),
        action: "created",
        actorEmail: user.email || user.username,
        newValue: JSON.stringify({ ruleId, ruleName, severity }),
      }).run();

      return NextResponse.json({ success: true, action: "created", id: Number(result.lastInsertRowid) });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH — toggle active/inactive
export async function PATCH(request: NextRequest) {
  const user = getSessionUser();
  if (!user || !canEditSodRules(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, isActive } = body;
  if (!id || typeof isActive !== "boolean") {
    return NextResponse.json({ error: "Missing id or isActive" }, { status: 400 });
  }

  try {
    db.update(schema.sodRules)
      .set({ isActive })
      .where(eq(schema.sodRules.id, id))
      .run();

    db.insert(schema.auditLog).values({
      entityType: "sodRule",
      entityId: id,
      action: isActive ? "activated" : "deactivated",
      actorEmail: user.email || user.username,
      newValue: JSON.stringify({ isActive }),
    }).run();

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// DELETE — delete a SOD rule
export async function DELETE(request: NextRequest) {
  const user = getSessionUser();
  if (!user || !canEditSodRules(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id } = body;
  if (!id || typeof id !== "number") {
    return NextResponse.json({ error: "Missing or invalid id" }, { status: 400 });
  }

  try {
    // Get rule info for audit log before deleting
    const rule = db.select().from(schema.sodRules).where(eq(schema.sodRules.id, id)).get();
    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    db.delete(schema.sodRules).where(eq(schema.sodRules.id, id)).run();

    db.insert(schema.auditLog).values({
      entityType: "sodRule",
      entityId: id,
      action: "deleted",
      actorEmail: user.email || user.username,
      oldValue: JSON.stringify({ ruleId: rule.ruleId, ruleName: rule.ruleName, severity: rule.severity }),
    }).run();

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
