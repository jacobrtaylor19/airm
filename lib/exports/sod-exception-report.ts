import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

export function generateSodExceptionCsv(): string {
  const conflicts = db.select({
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
  })
    .from(schema.sodConflicts)
    .innerJoin(schema.users, eq(schema.users.id, schema.sodConflicts.userId))
    .innerJoin(schema.sodRules, eq(schema.sodRules.id, schema.sodConflicts.sodRuleId))
    .where(eq(schema.sodConflicts.resolutionStatus, "risk_accepted"))
    .all();

  const header = "user,user_id,severity,rule,permission_a,permission_b,resolution,justification,resolved_by,resolved_at";
  const rows = conflicts.map(c =>
    [c.userName, c.userId, c.severity, c.ruleName, c.permissionA ?? "", c.permissionB ?? "", c.resolution, c.justification ?? "", c.resolvedBy ?? "", c.resolvedAt ?? ""]
      .map(csvEscape).join(",")
  );

  return [header, ...rows].join("\n");
}

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
