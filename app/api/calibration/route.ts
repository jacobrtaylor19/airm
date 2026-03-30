import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql, lte, inArray } from "drizzle-orm";
import { getUserScope } from "@/lib/scope";
import { reportError } from "@/lib/monitoring";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const threshold = parseInt(req.nextUrl.searchParams.get("threshold") ?? "70", 10);
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  const scopedUserIds = await getUserScope(user);

  try {
    // confidenceScore is a real column — compare numerically
    const baseCondition = lte(schema.userPersonaAssignments.confidenceScore, threshold);

    const selectFields = {
      assignmentId: schema.userPersonaAssignments.id,
      userId: schema.userPersonaAssignments.userId,
      personaId: schema.userPersonaAssignments.personaId,
      confidenceScore: schema.userPersonaAssignments.confidenceScore,
      aiReasoning: schema.userPersonaAssignments.aiReasoning,
      userName: schema.users.displayName,
      department: schema.users.department,
      personaName: schema.personas.name,
      personaDescription: schema.personas.description,
    };

    let assignments;
    if (scopedUserIds === null) {
      // No scope restriction — admin/system_admin/viewer
      assignments = await db
        .select(selectFields)
        .from(schema.userPersonaAssignments)
        .innerJoin(schema.users, eq(schema.userPersonaAssignments.userId, schema.users.id))
        .innerJoin(schema.personas, eq(schema.userPersonaAssignments.personaId, schema.personas.id))
        .where(baseCondition)
        .orderBy(schema.userPersonaAssignments.confidenceScore)
        .limit(limit);
    } else {
      if (scopedUserIds.length === 0) {
        return NextResponse.json({ assignments: [], total: 0, personas: [], threshold });
      }
      assignments = await db
        .select(selectFields)
        .from(schema.userPersonaAssignments)
        .innerJoin(schema.users, eq(schema.userPersonaAssignments.userId, schema.users.id))
        .innerJoin(schema.personas, eq(schema.userPersonaAssignments.personaId, schema.personas.id))
        .where(and(
          baseCondition,
          inArray(schema.userPersonaAssignments.userId, scopedUserIds),
        ))
        .orderBy(schema.userPersonaAssignments.confidenceScore)
        .limit(limit);
    }

    // Get total count of low-confidence assignments
    const countCondition = scopedUserIds === null
      ? baseCondition
      : and(baseCondition, inArray(schema.userPersonaAssignments.userId, scopedUserIds));

    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.userPersonaAssignments)
      .where(countCondition);

    // Get all personas for reassignment dropdown
    const allPersonas = await db
      .select({ id: schema.personas.id, name: schema.personas.name })
      .from(schema.personas)
      .orderBy(schema.personas.name);

    return NextResponse.json({
      assignments,
      total: Number(countRow?.count ?? 0),
      personas: allPersonas,
      threshold,
    });
  } catch (err) {
    reportError(err, { route: "GET /api/calibration" });
    return NextResponse.json({ error: "Failed to fetch calibration data" }, { status: 500 });
  }
}

// Accept, reassign, or remove an assignment
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin", "mapper"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { assignmentId, action, newPersonaId } = body;

    if (!assignmentId || !action) {
      return NextResponse.json({ error: "assignmentId and action required" }, { status: 400 });
    }

    if (action === "accept") {
      // Boost confidence to 100 and append review note
      const [current] = await db
        .select({ aiReasoning: schema.userPersonaAssignments.aiReasoning })
        .from(schema.userPersonaAssignments)
        .where(eq(schema.userPersonaAssignments.id, assignmentId));

      if (!current) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }

      const updatedReasoning = (current.aiReasoning ?? "") + ` [Manually accepted by ${user.displayName}]`;

      await db
        .update(schema.userPersonaAssignments)
        .set({
          confidenceScore: 100,
          aiReasoning: updatedReasoning,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.userPersonaAssignments.id, assignmentId));

      return NextResponse.json({ success: true, action: "accepted" });
    }

    if (action === "reassign") {
      if (!newPersonaId) {
        return NextResponse.json({ error: "newPersonaId required for reassign" }, { status: 400 });
      }

      const [current] = await db
        .select({ userId: schema.userPersonaAssignments.userId })
        .from(schema.userPersonaAssignments)
        .where(eq(schema.userPersonaAssignments.id, assignmentId));

      if (!current) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }

      await db
        .update(schema.userPersonaAssignments)
        .set({
          personaId: newPersonaId,
          confidenceScore: 100,
          aiReasoning: `Manually reassigned by ${user.displayName}`,
          assignmentMethod: "manual",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(schema.userPersonaAssignments.id, assignmentId));

      return NextResponse.json({ success: true, action: "reassigned", newPersonaId });
    }

    if (action === "remove") {
      await db
        .delete(schema.userPersonaAssignments)
        .where(eq(schema.userPersonaAssignments.id, assignmentId));

      return NextResponse.json({ success: true, action: "removed" });
    }

    return NextResponse.json({ error: "Invalid action. Use accept, reassign, or remove." }, { status: 400 });
  } catch (err) {
    reportError(err, { route: "PATCH /api/calibration" });
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}
