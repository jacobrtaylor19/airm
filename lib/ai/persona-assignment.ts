import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getAIProvider } from "@/lib/ai/provider";
import { getSetting } from "@/lib/settings";
import type { UserAccessProfile } from "./types";
import { loadUserProfiles } from "./load-user-profiles";

interface PersonaInfo {
  id: number;
  name: string;
  description: string | null;
  characteristicPermissions: string[];
}

async function getAvailablePersonas(): Promise<PersonaInfo[]> {
  const personas = await db.select().from(schema.personas);
  if (personas.length === 0) return [];

  // Bulk-load all persona permissions in 2 queries instead of N
  const personaIds = personas.map((p) => p.id);

  const allPerms = await db
    .select({
      personaId: schema.personaSourcePermissions.personaId,
      permId: schema.sourcePermissions.permissionId,
    })
    .from(schema.personaSourcePermissions)
    .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.personaSourcePermissions.sourcePermissionId))
    .where(inArray(schema.personaSourcePermissions.personaId, personaIds));

  const permsByPersona = new Map<number, string[]>();
  for (const row of allPerms) {
    if (!permsByPersona.has(row.personaId)) permsByPersona.set(row.personaId, []);
    permsByPersona.get(row.personaId)!.push(row.permId);
  }

  return personas.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    characteristicPermissions: permsByPersona.get(p.id) || [],
  }));
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

const BATCH_SIZE = 5; // Process 5 users concurrently

export async function runPersonaAssignment(jobId: number): Promise<{ usersAssigned: number; failed: number }> {
  const provider = await getAIProvider();
  const personas = await getAvailablePersonas();
  if (personas.length === 0) {
    throw new Error("No personas available. Run persona generation first.");
  }

  const users = await db.select().from(schema.users);

  // Bulk-load all user profiles upfront (3 queries instead of N+1)
  const allProfiles = await loadUserProfiles(users);
  const profileBySourceUserId = new Map<string, UserAccessProfile>();
  for (const p of allProfiles) {
    profileBySourceUserId.set(p.sourceUserId, p);
  }

  let usersAssigned = 0;
  let failed = 0;

  // Clear existing assignments
  await db.delete(schema.userPersonaAssignments);

  // Update total records for progress tracking
  await db.update(schema.processingJobs).set({
    totalRecords: users.length,
  }).where(eq(schema.processingJobs.id, jobId));

  // Process users in parallel batches
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (user) => {
        const profile = profileBySourceUserId.get(user.sourceUserId);
        if (!profile) throw new Error("no_profile");

        const prompt = buildPrompt(profile, personas);
        const text = await provider.generateText(prompt);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("no_json");

        const result: AssignmentResult = JSON.parse(jsonMatch[0]);
        return { user, result };
      })
    );

    // Write results to DB
    for (const outcome of results) {
      if (outcome.status === "fulfilled") {
        try {
          const { user, result } = outcome.value;
          const minConfidence = Math.max(40, Number((await getSetting("ai.confidenceThreshold")) || "85") * 0.5);
          const personaId = result.confidence >= minConfidence ? result.persona_id : null;
          const groupRows = personaId
            ? await db.select({ gid: schema.personas.consolidatedGroupId }).from(schema.personas).where(eq(schema.personas.id, personaId))
            : [];
          const groupId = groupRows[0]?.gid ?? null;

          await db.insert(schema.userPersonaAssignments).values({
            userId: user.id,
            personaId,
            consolidatedGroupId: groupId,
            confidenceScore: result.confidence,
            aiReasoning: result.reasoning,
            aiModel: provider.name,
            assignmentMethod: "ai_assignment",
            jobRunId: jobId,
          });

          usersAssigned++;
        } catch {
          failed++;
        }
      } else {
        failed++;
      }
    }

    // Update job progress after each batch
    await db.update(schema.processingJobs).set({
      processed: usersAssigned + failed,
    }).where(eq(schema.processingJobs.id, jobId));
  }

  return { usersAssigned, failed };
}
