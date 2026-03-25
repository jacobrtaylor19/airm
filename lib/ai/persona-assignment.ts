import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAIProvider } from "@/lib/ai/provider";
import { getSetting } from "@/lib/settings";

interface UserAccessProfile {
  sourceUserId: string;
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  roles: { roleId: string; roleName: string; domain: string | null }[];
  permissions: string[];
}

interface PersonaInfo {
  id: number;
  name: string;
  description: string | null;
  characteristicPermissions: string[];
}

function getAvailablePersonas(): PersonaInfo[] {
  const personas = db.select().from(schema.personas).all();
  return personas.map((p) => {
    const perms = db
      .select({ permId: schema.sourcePermissions.permissionId })
      .from(schema.personaSourcePermissions)
      .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.personaSourcePermissions.sourcePermissionId))
      .where(eq(schema.personaSourcePermissions.personaId, p.id))
      .all();
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      characteristicPermissions: perms.map((x) => x.permId),
    };
  });
}

function getUserProfile(userId: number): UserAccessProfile | null {
  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) return null;

  const roleAssignments = db
    .select({
      roleId: schema.sourceRoles.roleId,
      roleName: schema.sourceRoles.roleName,
      domain: schema.sourceRoles.domain,
    })
    .from(schema.userSourceRoleAssignments)
    .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.userSourceRoleAssignments.sourceRoleId))
    .where(eq(schema.userSourceRoleAssignments.userId, userId))
    .all();

  const permissions: string[] = [];
  for (const role of roleAssignments) {
    const perms = db
      .select({ permissionId: schema.sourcePermissions.permissionId })
      .from(schema.sourceRolePermissions)
      .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.sourceRolePermissions.sourcePermissionId))
      .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.sourceRolePermissions.sourceRoleId))
      .where(eq(schema.sourceRoles.roleId, role.roleId))
      .all();
    for (const p of perms) {
      if (!permissions.includes(p.permissionId)) permissions.push(p.permissionId);
    }
  }

  return {
    sourceUserId: user.sourceUserId,
    displayName: user.displayName,
    jobTitle: user.jobTitle,
    department: user.department,
    roles: roleAssignments,
    permissions,
  };
}

function buildPrompt(user: UserAccessProfile, personas: PersonaInfo[]): string {
  const roleSection = user.roles.length > 0
    ? user.roles.map(r => `- ${r.roleId}: ${r.roleName || "No description"}`).join("\n")
    : "No source role assignments available. Assignment based on job title and department.";

  const permSection = user.permissions.length > 0
    ? `Permissions held: ${user.permissions.join(", ")}`
    : "No permission data available.";

  return `You are an enterprise security analyst assigning a user to a security persona.

## User Profile
- Name: ${user.displayName}
- Department: ${user.department || "Unknown"}
- Job Title: ${user.jobTitle || "Unknown"}
- User ID: ${user.sourceUserId}

## Current Legacy Role Assignments
${roleSection}

## ${permSection}

## Available Security Personas
${personas.map(p => `
### ${p.name} (ID: ${p.id})
${p.description || "No description"}
Characteristic permissions: ${p.characteristicPermissions.join(", ") || "Not specified"}
`).join("\n")}

## Task
Assign this user to the SINGLE most appropriate persona. If the user has permission data, weight that heavily. If not, use job title and department.

Respond with ONLY JSON (no markdown):
{
  "persona_id": <integer>,
  "confidence": <number 0-100>,
  "reasoning": "<2-3 sentences>",
  "flags": ["<any concerns>"]
}

If no persona fits (confidence < 40), set persona_id to null.`;
}

interface AssignmentResult {
  persona_id: number | null;
  confidence: number;
  reasoning: string;
  flags: string[];
}

export async function runPersonaAssignment(jobId: number): Promise<{ usersAssigned: number; failed: number }> {
  const provider = getAIProvider();
  const personas = getAvailablePersonas();
  if (personas.length === 0) {
    throw new Error("No personas available. Run persona generation first.");
  }

  const users = db.select().from(schema.users).all();
  let usersAssigned = 0;
  let failed = 0;

  // Clear existing assignments
  db.delete(schema.userPersonaAssignments).run();

  for (const user of users) {
    try {
      const profile = getUserProfile(user.id);
      if (!profile) { failed++; continue; }

      const prompt = buildPrompt(profile, personas);
      const text = await provider.generateText(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { failed++; continue; }

      const result: AssignmentResult = JSON.parse(jsonMatch[0]);
      // Use configured confidence threshold (minimum 40 to avoid null assignments for borderline matches)
      const minConfidence = Math.max(40, Number(getSetting("ai.confidenceThreshold") || "85") * 0.5);
      const personaId = result.confidence >= minConfidence ? result.persona_id : null;
      const groupId = personaId
        ? db.select({ gid: schema.personas.consolidatedGroupId }).from(schema.personas).where(eq(schema.personas.id, personaId)).get()?.gid ?? null
        : null;

      db.insert(schema.userPersonaAssignments).values({
        userId: user.id,
        personaId,
        consolidatedGroupId: groupId,
        confidenceScore: result.confidence,
        aiReasoning: result.reasoning,
        aiModel: provider.name,
        assignmentMethod: "ai_assignment",
        jobRunId: jobId,
      }).run();

      usersAssigned++;
    } catch {
      failed++;
    }

    // Update job progress
    db.update(schema.processingJobs).set({
      processed: usersAssigned + failed,
    }).where(eq(schema.processingJobs.id, jobId)).run();
  }

  return { usersAssigned, failed };
}
