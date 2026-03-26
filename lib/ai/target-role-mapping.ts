import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAIProvider } from "@/lib/ai/provider";

function buildMappingPrompt(
  persona: { name: string; description: string | null; businessFunction: string | null },
  targetRoles: { roleId: string; roleName: string; description: string | null; domain: string | null }[]
): string {
  return `You are an enterprise security architect applying least-access principles.

## Persona
Name: ${persona.name}
Description: ${persona.description || "Not specified"}
Business Function: ${persona.businessFunction || "Not specified"}

## Available Target Roles
${targetRoles.map(r => `- ${r.roleId}: ${r.roleName} — ${r.description || "No description"} [Domain: ${r.domain || "General"}]`).join("\n")}

## Task
Select the MINIMUM set of target roles this persona needs to perform their job function. Apply least-access principles: only include roles that are genuinely required. Do not add "nice to have" roles.

For each selected role, explain why it's necessary.

Respond with ONLY JSON (no markdown):
{
  "mappings": [
    {
      "target_role_id": "string",
      "reason": "string",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "notes": "string — any concerns about coverage gaps or over-provisioning"
}`;
}

interface MappingResult {
  mappings: { target_role_id: string; reason: string; confidence: string }[];
  notes: string;
}

const BATCH_SIZE = 5; // Process 5 personas concurrently

export async function runTargetRoleMapping(jobId: number): Promise<{ personasMapped: number; totalMappings: number }> {
  const provider = getAIProvider();
  const personas = db.select().from(schema.personas).all();
  const targetRoles = db.select().from(schema.targetRoles).all();

  if (targetRoles.length === 0) {
    throw new Error("No target roles available. Upload target roles first.");
  }

  // Find personas that already have manual mappings — skip them
  const existingMappings = db.select({ personaId: schema.personaTargetRoleMappings.personaId })
    .from(schema.personaTargetRoleMappings).all();
  const mappedPersonaIds = new Set(existingMappings.map(m => m.personaId));
  const unmappedPersonas = personas.filter(p => !mappedPersonaIds.has(p.id));

  // Update total records for progress tracking
  db.update(schema.processingJobs).set({
    totalRecords: unmappedPersonas.length,
  }).where(eq(schema.processingJobs.id, jobId)).run();

  let personasMapped = 0;
  let totalMappings = 0;

  // Process only unmapped personas in parallel batches
  for (let i = 0; i < unmappedPersonas.length; i += BATCH_SIZE) {
    const batch = unmappedPersonas.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (persona) => {
        const prompt = buildMappingPrompt(persona, targetRoles);
        const text = await provider.generateText(prompt);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("no_json");
        const result: MappingResult = JSON.parse(jsonMatch[0]);
        return { persona, result };
      })
    );

    // Write results to DB synchronously (SQLite requirement)
    for (const outcome of results) {
      if (outcome.status === "fulfilled") {
        const { persona, result } = outcome.value;
        for (const mapping of result.mappings) {
          const targetRole = targetRoles.find(r => r.roleId === mapping.target_role_id);
          if (!targetRole) continue;

          db.insert(schema.personaTargetRoleMappings).values({
            personaId: persona.id,
            targetRoleId: targetRole.id,
            mappingReason: mapping.reason,
            confidence: mapping.confidence,
          }).run();
          totalMappings++;
        }
        personasMapped++;
      }
      // Failed personas are silently skipped
    }

    // Update progress after each batch
    db.update(schema.processingJobs).set({
      processed: personasMapped,
    }).where(eq(schema.processingJobs.id, jobId)).run();
  }

  // Derive user-level target role assignments from persona mappings
  deriveUserTargetRoleAssignments();

  return { personasMapped, totalMappings };
}

function deriveUserTargetRoleAssignments() {
  // For each user with a persona assignment, create target role assignments
  // based on their persona's mappings
  const assignments = db.select().from(schema.userPersonaAssignments).all();

  for (const assignment of assignments) {
    if (!assignment.personaId) continue;

    const mappings = db.select().from(schema.personaTargetRoleMappings)
      .where(eq(schema.personaTargetRoleMappings.personaId, assignment.personaId))
      .all();

    for (const mapping of mappings) {
      // Check if assignment already exists
      const existing = db.select().from(schema.userTargetRoleAssignments)
        .where(eq(schema.userTargetRoleAssignments.userId, assignment.userId))
        .all()
        .find(a => a.targetRoleId === mapping.targetRoleId);

      if (!existing) {
        db.insert(schema.userTargetRoleAssignments).values({
          userId: assignment.userId,
          targetRoleId: mapping.targetRoleId,
          derivedFromPersonaId: assignment.personaId,
          assignmentType: "persona_default",
          status: "draft",
        }).run();
      }
    }
  }
}
