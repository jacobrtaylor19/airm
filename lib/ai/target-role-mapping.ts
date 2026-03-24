import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

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

export async function runTargetRoleMapping(jobId: number): Promise<{ personasMapped: number; totalMappings: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_key_here" || apiKey.length < 10) {
    throw new Error("ANTHROPIC_API_KEY is missing or invalid in .env.local.");
  }

  const client = new Anthropic({ apiKey });
  const personas = db.select().from(schema.personas).all();
  const targetRoles = db.select().from(schema.targetRoles).all();

  if (targetRoles.length === 0) {
    throw new Error("No target roles available. Upload target roles first.");
  }

  // Clear existing mappings
  db.delete(schema.personaTargetRoleMappings).run();
  db.delete(schema.userTargetRoleAssignments).run();

  let personasMapped = 0;
  let totalMappings = 0;

  for (const persona of personas) {
    try {
      const prompt = buildMappingPrompt(persona, targetRoles);
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      });

      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const result: MappingResult = JSON.parse(jsonMatch[0]);

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
    } catch {
      // Continue with other personas
    }

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
