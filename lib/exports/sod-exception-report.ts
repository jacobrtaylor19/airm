import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export async function generateSodExceptionCsv(): Promise<string> {
  const conflicts = await db.select({
    userName: schema.users.displayName,
    userId: schema.users.sourceUserId,
    severity: schema.sodConflicts.severity,
    ruleName: schema.sodRules.ruleName,
    permissionA: schema.sodConflicts.permissionIdA,
    permissionB: schema.sodConflicts.permissionIdB,
    resolution: schema.sodConflicts.resolutionStatus,
    justification: schema.sodConflicts.resolutionNotes,
    resolvedBy: schema.sodConflicts.resolvedBy,
    resolvedAt: schema.sodConflicts.resolvedAt,
    mitigatingControl: schema.sodConflicts.mitigatingControl,
    controlOwner: schema.sodConflicts.controlOwner,
    controlFrequency: schema.sodConflicts.controlFrequency,
  })
    .from(schema.sodConflicts)
    .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .where(eq(schema.sodConflicts.resolutionStatus, "risk_accepted"));

  const now = new Date().toISOString().split("T")[0];
  const brandedHeader = `# Provisum SOD Exception Report — Generated ${now}`;
  const brandedSubheader = `# Accepted SOD risk exceptions with mitigating controls`;
  const header = "user,user_id,severity,rule,permission_a,permission_b,resolution,justification,resolved_by,resolved_at,mitigating_control,control_owner,control_frequency";
  const rows = conflicts.map(c =>
    [c.userName, c.userId, c.severity, c.ruleName, c.permissionA ?? "", c.permissionB ?? "", c.resolution, c.justification ?? "", c.resolvedBy ?? "", c.resolvedAt ?? "", c.mitigatingControl ?? "", c.controlOwner ?? "", c.controlFrequency ?? ""]
      .map(csvEscape).join(",")
  );

  return [brandedHeader, brandedSubheader, header, ...rows].join("\n");
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
