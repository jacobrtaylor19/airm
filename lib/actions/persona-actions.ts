"use server";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";

export async function updatePersona(
  personaId: number,
  updates: {
    name?: string;
    businessFunction?: string;
    description?: string;
  }
) {
  const user = getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const existing = db
    .select()
    .from(schema.personas)
    .where(eq(schema.personas.id, personaId))
    .get();
  if (!existing) throw new Error("Persona not found");

  const oldValue = {
    name: existing.name,
    businessFunction: existing.businessFunction,
    description: existing.description,
  };

  db.update(schema.personas)
    .set({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.businessFunction !== undefined && { businessFunction: updates.businessFunction }),
      ...(updates.description !== undefined && { description: updates.description }),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.personas.id, personaId))
    .run();

  db.insert(schema.auditLog)
    .values({
      entityType: "persona",
      entityId: personaId,
      action: "updated",
      oldValue: JSON.stringify(oldValue),
      newValue: JSON.stringify(updates),
      actorEmail: user.email ?? user.username,
    })
    .run();

  revalidatePath(`/personas/${personaId}`);
  revalidatePath("/personas");
  return { success: true };
}

export async function updatePersonaUsers(
  personaId: number,
  userIds: number[]
) {
  const user = getSessionUser();
  if (!user) throw new Error("Not authenticated");

  // Get current assignments
  const current = db
    .select({ userId: schema.userPersonaAssignments.userId })
    .from(schema.userPersonaAssignments)
    .where(eq(schema.userPersonaAssignments.personaId, personaId))
    .all()
    .map((r) => r.userId);

  const toAdd = userIds.filter((id) => !current.includes(id));
  const toRemove = current.filter((id) => !userIds.includes(id));

  // Remove unselected users
  if (toRemove.length > 0) {
    db.delete(schema.userPersonaAssignments)
      .where(
        and(
          eq(schema.userPersonaAssignments.personaId, personaId),
          inArray(schema.userPersonaAssignments.userId, toRemove)
        )
      )
      .run();
  }

  // Add new users (remove from other personas first)
  for (const uid of toAdd) {
    db.delete(schema.userPersonaAssignments)
      .where(eq(schema.userPersonaAssignments.userId, uid))
      .run();

    db.insert(schema.userPersonaAssignments)
      .values({
        userId: uid,
        personaId,
        assignmentMethod: "manual",
        confidenceScore: 100,
      })
      .run();
  }

  db.insert(schema.auditLog)
    .values({
      entityType: "persona",
      entityId: personaId,
      action: "users_updated",
      oldValue: JSON.stringify(current),
      newValue: JSON.stringify(userIds),
      actorEmail: user.email ?? user.username,
    })
    .run();

  revalidatePath(`/personas/${personaId}`);
  revalidatePath("/personas");
  return { success: true };
}

export async function updatePersonaTargetRoles(
  personaId: number,
  targetRoleIds: number[]
) {
  const user = getSessionUser();
  if (!user) throw new Error("Not authenticated");

  const current = db
    .select({ targetRoleId: schema.personaTargetRoleMappings.targetRoleId })
    .from(schema.personaTargetRoleMappings)
    .where(eq(schema.personaTargetRoleMappings.personaId, personaId))
    .all()
    .map((r) => r.targetRoleId);

  const toAdd = targetRoleIds.filter((id) => !current.includes(id));
  const toRemove = current.filter((id) => !targetRoleIds.includes(id));

  if (toRemove.length > 0) {
    db.delete(schema.personaTargetRoleMappings)
      .where(
        and(
          eq(schema.personaTargetRoleMappings.personaId, personaId),
          inArray(schema.personaTargetRoleMappings.targetRoleId, toRemove)
        )
      )
      .run();
  }

  for (const roleId of toAdd) {
    db.insert(schema.personaTargetRoleMappings)
      .values({
        personaId,
        targetRoleId: roleId,
        confidence: "manual",
        mappingReason: "Manually assigned",
      })
      .run();
  }

  db.insert(schema.auditLog)
    .values({
      entityType: "persona",
      entityId: personaId,
      action: "target_roles_updated",
      oldValue: JSON.stringify(current),
      newValue: JSON.stringify(targetRoleIds),
      actorEmail: user.email ?? user.username,
    })
    .run();

  revalidatePath(`/personas/${personaId}`);
  revalidatePath("/personas");
  return { success: true };
}
