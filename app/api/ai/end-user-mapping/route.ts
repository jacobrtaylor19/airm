import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeError } from "@/lib/errors";
import { getSessionUser } from "@/lib/auth";
import { checkAIRate } from "@/lib/rate-limit-middleware";
import { MAPPER_ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = getSessionUser();
  if (!user || !(MAPPER_ROLES as readonly string[]).includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const rateLimited = checkAIRate(req, String(user.id));
  if (rateLimited) return rateLimited;
  const job = db.insert(schema.processingJobs).values({
    jobType: "end_user_mapping",
    status: "running",
    startedAt: new Date().toISOString(),
  }).returning().get();

  try {
    // Get all persona-target role mappings
    const personaMappings = db
      .select({
        personaId: schema.personaTargetRoleMappings.personaId,
        targetRoleId: schema.personaTargetRoleMappings.targetRoleId,
      })
      .from(schema.personaTargetRoleMappings)
      .where(eq(schema.personaTargetRoleMappings.isActive, true))
      .all();

    if (personaMappings.length === 0) {
      throw new Error("No persona-target role mappings found. Run target role mapping first.");
    }

    // Get all user-persona assignments
    const userAssignments = db
      .select({
        userId: schema.userPersonaAssignments.userId,
        personaId: schema.userPersonaAssignments.personaId,
      })
      .from(schema.userPersonaAssignments)
      .all();

    if (userAssignments.length === 0) {
      throw new Error("No user-persona assignments found. Run persona assignment first.");
    }

    // Build persona -> target roles map
    const personaRoleMap = new Map<number, number[]>();
    for (const m of personaMappings) {
      const existing = personaRoleMap.get(m.personaId) ?? [];
      existing.push(m.targetRoleId);
      personaRoleMap.set(m.personaId, existing);
    }

    // Pre-load all existing assignments for fast lookup
    const allExisting = db.select().from(schema.userTargetRoleAssignments).all();
    const existingMap = new Map<string, typeof allExisting[0]>();
    for (const a of allExisting) {
      existingMap.set(`${a.userId}-${a.targetRoleId}`, a);
    }

    // Create user-target role assignments, detect override preservation
    let created = 0;
    let overridesPreserved = 0;
    const now = new Date().toISOString();

    for (const ua of userAssignments) {
      if (!ua.personaId) continue;
      const targetRoleIds = personaRoleMap.get(ua.personaId) ?? [];
      for (const targetRoleId of targetRoleIds) {
        const key = `${ua.userId}-${targetRoleId}`;
        const existing = existingMap.get(key);

        if (!existing) {
          db.insert(schema.userTargetRoleAssignments)
            .values({
              userId: ua.userId,
              targetRoleId,
              derivedFromPersonaId: ua.personaId,
              assignmentType: "persona_default",
              status: "draft",
            })
            .run();
          created++;
        } else if (existing.assignmentType === "individual_override") {
          // Persona mapping pushed but individual override exists — flag it
          db.update(schema.userTargetRoleAssignments)
            .set({ personaMappingChangedAt: now })
            .where(eq(schema.userTargetRoleAssignments.id, existing.id))
            .run();
          overridesPreserved++;
        }
      }
    }

    db.update(schema.processingJobs).set({
      status: "completed",
      totalRecords: userAssignments.length,
      processed: created,
      completedAt: new Date().toISOString(),
    }).where(eq(schema.processingJobs.id, job.id)).run();

    db.insert(schema.auditLog).values({
      entityType: "processingJob",
      entityId: job.id,
      action: "end_user_mapping_completed",
      newValue: JSON.stringify({ usersProcessed: userAssignments.length, assignmentsCreated: created, overridesPreserved }),
    }).run();

    return NextResponse.json({
      jobId: job.id,
      usersProcessed: userAssignments.length,
      assignmentsCreated: created,
    });
  } catch (err: unknown) {
    const message = safeError(err, "Unknown error");
    db.update(schema.processingJobs).set({
      status: "failed",
      errorLog: message,
      completedAt: new Date().toISOString(),
    }).where(eq(schema.processingJobs.id, job.id)).run();

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
