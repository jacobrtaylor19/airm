import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

interface UserAccessProfile {
  sourceUserId: string;
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  roles: { roleId: string; roleName: string; domain: string | null }[];
  permissions: string[];
}

function assembleUserProfiles(): UserAccessProfile[] {
  const users = db.select().from(schema.users).all();
  const profiles: UserAccessProfile[] = [];

  for (const user of users) {
    const roleAssignments = db
      .select({
        roleId: schema.sourceRoles.roleId,
        roleName: schema.sourceRoles.roleName,
        domain: schema.sourceRoles.domain,
      })
      .from(schema.userSourceRoleAssignments)
      .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.userSourceRoleAssignments.sourceRoleId))
      .where(eq(schema.userSourceRoleAssignments.userId, user.id))
      .all();

    const permissions: string[] = [];
    if (roleAssignments.length > 0) {
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
    }

    profiles.push({
      sourceUserId: user.sourceUserId,
      displayName: user.displayName,
      jobTitle: user.jobTitle,
      department: user.department,
      roles: roleAssignments,
      permissions,
    });
  }

  return profiles;
}

function summarizeByDepartment(profiles: UserAccessProfile[]): string {
  const depts = new Map<string, { count: number; titles: Set<string> }>();
  for (const p of profiles) {
    const dept = p.department || "Unknown";
    if (!depts.has(dept)) depts.set(dept, { count: 0, titles: new Set() });
    const d = depts.get(dept)!;
    d.count++;
    if (p.jobTitle) d.titles.add(p.jobTitle);
  }
  return Array.from(depts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([dept, d]) => `${dept}: ${d.count} users (titles: ${Array.from(d.titles).slice(0, 5).join(", ")})`)
    .join("\n");
}

function summarizeRolePatterns(profiles: UserAccessProfile[]): string {
  const patterns = new Map<string, { count: number; roles: string[]; sampleUsers: string[] }>();
  for (const p of profiles) {
    const key = p.roles.map(r => r.roleId).sort().join("+") || "NO_ROLES";
    if (!patterns.has(key)) patterns.set(key, { count: 0, roles: p.roles.map(r => r.roleId), sampleUsers: [] });
    const pat = patterns.get(key)!;
    pat.count++;
    if (pat.sampleUsers.length < 3) pat.sampleUsers.push(p.sourceUserId);
  }
  return Array.from(patterns.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map(p => `${p.count} users share: [${p.roles.join(", ") || "no roles"}] (e.g., ${p.sampleUsers.join(", ")})`)
    .join("\n");
}

function buildPrompt(profiles: UserAccessProfile[]): string {
  const deptSummary = summarizeByDepartment(profiles);
  const rolePatterns = summarizeRolePatterns(profiles);

  return `You are an enterprise security architect designing a persona-based security model for a system migration.

## Context
You are analyzing ${profiles.length} users from a legacy system to identify distinct security personas. A "persona" represents a group of users who perform similar business functions and need similar system access.

## User Population Summary

### By Department
${deptSummary}

### Common Role Assignment Patterns
${rolePatterns}

## Detailed User Profiles
${profiles.map(u => `
- ${u.sourceUserId} | ${u.displayName} | ${u.jobTitle || "No title"} | ${u.department || "No dept"}
  Roles: ${u.roles.length > 0 ? u.roles.map(r => r.roleId).join(", ") : "None assigned"}
  Permissions: ${u.permissions.length > 0 ? u.permissions.slice(0, 20).join(", ") + (u.permissions.length > 20 ? ` (+${u.permissions.length - 20} more)` : "") : "None"}
`).join("")}

## Task
Analyze these users and generate a set of security personas that represent the distinct access patterns in this organization.

For each persona:
1. Give it a clear, descriptive name (e.g., "Accounts Payable Processor", "Supply Chain Planner")
2. Write a 1-2 sentence description of what this persona does
3. Identify the business function (Finance, Procurement, Supply Chain, etc.)
4. List the characteristic permissions (legacy T-codes/functions) that define this persona
5. Suggest a consolidated security group this persona belongs to

Also assign each user to exactly one persona with a confidence score (0-100).

Design principles:
- Aim for the minimum number of personas that accurately represent the population
- Users with identical or near-identical role assignments should share a persona
- Each persona should be distinguishable by its permission profile
- Personas should align with business functions, not individual role names

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "personas": [
    {
      "name": "string",
      "description": "string",
      "business_function": "string",
      "characteristic_permissions": ["string"],
      "suggested_group": "string"
    }
  ],
  "consolidated_groups": [
    {
      "name": "string",
      "description": "string",
      "access_level": "string"
    }
  ],
  "user_assignments": [
    {
      "source_user_id": "string",
      "persona_name": "string",
      "confidence": 85,
      "reasoning": "string"
    }
  ]
}`;
}

interface GenerationResult {
  personas: { name: string; description: string; business_function: string; characteristic_permissions: string[]; suggested_group: string }[];
  consolidated_groups: { name: string; description: string; access_level: string }[];
  user_assignments: { source_user_id: string; persona_name: string; confidence: number; reasoning: string }[];
}

export async function runPersonaGeneration(jobId: number): Promise<{ personasCreated: number; usersAssigned: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_key_here" || apiKey.length < 10) {
    throw new Error("ANTHROPIC_API_KEY is missing or invalid in .env.local. Set a valid API key to run AI pipeline jobs.");
  }

  const client = new Anthropic({ apiKey });
  const profiles = assembleUserProfiles();
  const prompt = buildPrompt(profiles);

  // Clear existing AI-generated data
  db.delete(schema.userPersonaAssignments).run();
  db.delete(schema.personaSourcePermissions).run();
  db.delete(schema.personas).where(eq(schema.personas.source, "ai")).run();
  // Only delete groups that have no remaining personas
  const groupsWithPersonas = db.select({ id: schema.consolidatedGroups.id }).from(schema.consolidatedGroups)
    .innerJoin(schema.personas, eq(schema.personas.consolidatedGroupId, schema.consolidatedGroups.id))
    .all().map(g => g.id);
  if (groupsWithPersonas.length === 0) {
    db.delete(schema.consolidatedGroups).run();
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response — no JSON found");

  const result: GenerationResult = JSON.parse(jsonMatch[0]);

  // Clear ALL existing data for fresh generation
  db.delete(schema.userPersonaAssignments).run();
  db.delete(schema.personaSourcePermissions).run();
  db.delete(schema.personaTargetRoleMappings).run();
  db.delete(schema.userTargetRoleAssignments).run();
  db.delete(schema.personas).run();
  db.delete(schema.consolidatedGroups).run();

  // Create consolidated groups
  const groupMap = new Map<string, number>();
  for (const group of result.consolidated_groups) {
    const inserted = db.insert(schema.consolidatedGroups).values({
      name: group.name,
      description: group.description,
      accessLevel: group.access_level,
    }).returning().get();
    groupMap.set(group.name, inserted.id);
  }

  // Create personas
  const personaMap = new Map<string, number>();
  for (const persona of result.personas) {
    const groupId = groupMap.get(persona.suggested_group) ?? null;
    const inserted = db.insert(schema.personas).values({
      name: persona.name,
      description: persona.description,
      businessFunction: persona.business_function,
      consolidatedGroupId: groupId,
      source: "ai",
    }).returning().get();
    personaMap.set(persona.name, inserted.id);

    // Create persona source permissions
    for (const permId of persona.characteristic_permissions) {
      const perm = db.select().from(schema.sourcePermissions)
        .where(eq(schema.sourcePermissions.permissionId, permId)).get();
      if (perm) {
        db.insert(schema.personaSourcePermissions).values({
          personaId: inserted.id,
          sourcePermissionId: perm.id,
          isRequired: true,
        }).run();
      }
    }
  }

  // Assign users to personas
  let usersAssigned = 0;
  for (const assignment of result.user_assignments) {
    const user = db.select().from(schema.users)
      .where(eq(schema.users.sourceUserId, assignment.source_user_id)).get();
    const personaId = personaMap.get(assignment.persona_name) ?? null;

    if (user) {
      const groupId = personaId
        ? db.select({ gid: schema.personas.consolidatedGroupId }).from(schema.personas).where(eq(schema.personas.id, personaId)).get()?.gid ?? null
        : null;

      db.insert(schema.userPersonaAssignments).values({
        userId: user.id,
        personaId,
        consolidatedGroupId: groupId,
        confidenceScore: assignment.confidence,
        aiReasoning: assignment.reasoning,
        aiModel: "claude-sonnet-4-20250514",
        assignmentMethod: "ai_generation",
        jobRunId: jobId,
      }).run();
      usersAssigned++;
    }
  }

  return { personasCreated: result.personas.length, usersAssigned };
}
