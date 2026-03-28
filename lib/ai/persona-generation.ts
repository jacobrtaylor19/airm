import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAIProvider } from "@/lib/ai/provider";

interface UserAccessProfile {
  sourceUserId: string;
  displayName: string;
  jobTitle: string | null;
  department: string | null;
  roles: { roleId: string; roleName: string; domain: string | null }[];
  permissions: string[];
}

async function assembleUserProfiles(): Promise<UserAccessProfile[]> {
  const users = await db.select().from(schema.users);
  const profiles: UserAccessProfile[] = [];

  for (const user of users) {
    const roleAssignments = await db
      .select({
        roleId: schema.sourceRoles.roleId,
        roleName: schema.sourceRoles.roleName,
        domain: schema.sourceRoles.domain,
      })
      .from(schema.userSourceRoleAssignments)
      .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.userSourceRoleAssignments.sourceRoleId))
      .where(eq(schema.userSourceRoleAssignments.userId, user.id));

    const permissions: string[] = [];
    if (roleAssignments.length > 0) {
      for (const role of roleAssignments) {
        const perms = await db
          .select({ permissionId: schema.sourcePermissions.permissionId })
          .from(schema.sourceRolePermissions)
          .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.sourceRolePermissions.sourcePermissionId))
          .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.sourceRolePermissions.sourceRoleId))
          .where(eq(schema.sourceRoles.roleId, role.roleId));
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

## Sample User Profiles (representative sample of ${profiles.length} total users)
${profiles.slice(0, 100).map(u => `
- ${u.sourceUserId} | ${u.displayName} | ${u.jobTitle || "No title"} | ${u.department || "No dept"}
  Roles: ${u.roles.length > 0 ? u.roles.map(r => r.roleId).join(", ") : "None assigned"}
  Permissions: ${u.permissions.length > 0 ? u.permissions.slice(0, 10).join(", ") + (u.permissions.length > 10 ? ` (+${u.permissions.length - 10} more)` : "") : "None"}
`).join("")}

## Task
Analyze these users and generate a set of security personas that represent the distinct access patterns in this organization.

For each persona:
1. Give it a clear, descriptive name (e.g., "Accounts Payable Processor", "Supply Chain Planner")
2. Write a 1-2 sentence description of what this persona does
3. Identify the business function (Finance, Procurement, Supply Chain, etc.)
4. List the characteristic permissions (legacy T-codes/functions) that define this persona
5. Suggest a consolidated security group this persona belongs to

Design principles:
- Aim for the minimum number of personas that accurately represent the population
- Users with identical or near-identical role assignments should share a persona
- Each persona should be distinguishable by its permission profile
- Personas should align with business functions, not individual role names
- Generate 15-30 personas typically for a population of this size

Do NOT assign individual users. Just define the personas and groups.

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
  ]
}`;
}

interface GenerationResult {
  personas: { name: string; description: string; business_function: string; characteristic_permissions: string[]; suggested_group: string }[];
  consolidated_groups: { name: string; description: string; access_level: string }[];
}

export async function runPersonaGeneration(jobId: number): Promise<{ personasCreated: number; usersAssigned: number }> {
  const provider = await getAIProvider();
  const profiles = await assembleUserProfiles();
  const prompt = buildPrompt(profiles);

  const text = await provider.generateText(prompt);
  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse AI response — no JSON found");

  const result: GenerationResult = JSON.parse(jsonMatch[0]);

  // Clear ALL existing data for fresh generation
  // Order matters: delete children before parents to satisfy FK constraints
  // (userTargetRoleAssignments.derivedFromPersonaId references personas without CASCADE)
  await db.delete(schema.userPersonaAssignments);
  await db.delete(schema.personaSourcePermissions);
  await db.delete(schema.personaTargetRoleMappings);
  await db.delete(schema.userTargetRoleAssignments);
  await db.delete(schema.permissionGaps);
  await db.delete(schema.leastAccessExceptions);
  await db.delete(schema.personas);
  await db.delete(schema.consolidatedGroups);

  // Create consolidated groups
  const groupMap = new Map<string, number>();
  for (const group of result.consolidated_groups) {
    const [inserted] = await db.insert(schema.consolidatedGroups).values({
      name: group.name,
      description: group.description,
      accessLevel: group.access_level,
    }).returning();
    groupMap.set(group.name, inserted.id);
  }

  // Create personas
  const personaMap = new Map<string, number>();
  for (const persona of result.personas) {
    const groupId = groupMap.get(persona.suggested_group) ?? null;
    const [inserted] = await db.insert(schema.personas).values({
      name: persona.name,
      description: persona.description,
      businessFunction: persona.business_function,
      consolidatedGroupId: groupId,
      source: "ai",
    }).returning();
    personaMap.set(persona.name, inserted.id);

    // Create persona source permissions
    for (const permId of persona.characteristic_permissions) {
      const [perm] = await db.select().from(schema.sourcePermissions)
        .where(eq(schema.sourcePermissions.permissionId, permId));
      if (perm) {
        await db.insert(schema.personaSourcePermissions).values({
          personaId: inserted.id,
          sourcePermissionId: perm.id,
          isRequired: true,
        });
      }
    }
  }

  // Phase 2: Assign users to personas programmatically by department/role matching
  // Build a map of business_function → persona for matching
  const funcToPersonas = new Map<string, { id: number; name: string; permissions: Set<string> }[]>();
  for (const persona of result.personas) {
    const func = persona.business_function.toLowerCase();
    if (!funcToPersonas.has(func)) funcToPersonas.set(func, []);
    funcToPersonas.get(func)!.push({
      id: personaMap.get(persona.name)!,
      name: persona.name,
      permissions: new Set(persona.characteristic_permissions),
    });
  }

  // Get all personas as flat list for fallback matching
  const allPersonas = Array.from(personaMap.entries()).map(([name, id]) => {
    const p = result.personas.find(rp => rp.name === name)!;
    return { id, name, func: p.business_function.toLowerCase(), permissions: new Set(p.characteristic_permissions) };
  });

  let usersAssigned = 0;
  const totalUsers = profiles.length;

  // Update job progress
  await db.update(schema.processingJobs).set({ totalRecords: totalUsers }).where(eq(schema.processingJobs.id, jobId));

  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    const dept = (profile.department || "").toLowerCase();
    const userPerms = new Set(profile.permissions);

    // Find best matching persona: first by department/function, then by permission overlap
    let bestPersona: { id: number; name: string } | null = null;
    let bestScore = -1;

    // Try matching by department → business function
    const candidates = funcToPersonas.get(dept) || allPersonas;

    for (const persona of candidates) {
      // Score = number of overlapping permissions
      let overlap = 0;
      const permArr = Array.from(persona.permissions);
      for (const p of permArr) {
        if (userPerms.has(p)) overlap++;
      }
      if (overlap > bestScore) {
        bestScore = overlap;
        bestPersona = persona;
      }
    }

    // If no match by department, try all personas
    if (bestScore === 0) {
      for (const persona of allPersonas) {
        let overlap = 0;
        const permArr = Array.from(persona.permissions);
        for (const p of permArr) {
          if (userPerms.has(p)) overlap++;
        }
        if (overlap > bestScore) {
          bestScore = overlap;
          bestPersona = persona;
        }
      }
    }

    // Fallback: assign to first persona matching department, or first persona overall
    if (!bestPersona) {
      bestPersona = allPersonas[0];
    }

    const [user] = await db.select().from(schema.users)
      .where(eq(schema.users.sourceUserId, profile.sourceUserId));

    if (user && bestPersona) {
      const groupRows = await db.select({ gid: schema.personas.consolidatedGroupId })
        .from(schema.personas).where(eq(schema.personas.id, bestPersona.id));
      const groupId = groupRows[0]?.gid ?? null;

      const confidence = bestScore > 0 ? Math.min(95, 60 + bestScore * 5) : 70;

      await db.insert(schema.userPersonaAssignments).values({
        userId: user.id,
        personaId: bestPersona.id,
        consolidatedGroupId: groupId,
        confidenceScore: confidence,
        aiReasoning: `Matched to "${bestPersona.name}" by ${bestScore > 0 ? "permission overlap" : "department"} (${dept || "unspecified"})`,
        aiModel: provider.name,
        assignmentMethod: "ai_generation",
        jobRunId: jobId,
      });
      usersAssigned++;
    }

    // Update progress every 50 users
    if (i % 50 === 0) {
      await db.update(schema.processingJobs).set({ processed: i + 1 }).where(eq(schema.processingJobs.id, jobId));
    }
  }

  // Final progress update
  await db.update(schema.processingJobs).set({ processed: usersAssigned }).where(eq(schema.processingJobs.id, jobId));

  return { personasCreated: result.personas.length, usersAssigned };
}
