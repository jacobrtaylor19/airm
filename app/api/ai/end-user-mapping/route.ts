import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST() {
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

    // Create user-target role assignments
    let created = 0;
    for (const ua of userAssignments) {
      if (!ua.personaId) continue;
      const targetRoleIds = personaRoleMap.get(ua.personaId) ?? [];
      for (const targetRoleId of targetRoleIds) {
        // Check if assignment already exists
        const existing = db
          .select({ id: schema.userTargetRoleAssignments.id })
          .from(schema.userTargetRoleAssignments)
          .where(
            eq(schema.userTargetRoleAssignments.userId, ua.userId)
          )
          .all()
          .find((e) => {
            const full = db
              .select()
              .from(schema.userTargetRoleAssignments)
              .where(eq(schema.userTargetRoleAssignments.id, e.id))
              .get();
            return full?.targetRoleId === targetRoleId;
          });

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
      newValue: JSON.stringify({ usersProcessed: userAssignments.length, assignmentsCreated: created }),
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
