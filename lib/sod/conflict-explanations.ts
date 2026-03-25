/**
 * SOD Conflict Explanation Generator
 *
 * Produces human-readable explanations for SOD conflicts, including:
 * - Why the conflict is risky
 * - What the mapper should do to fix it
 * - Impact of each resolution option
 */

interface RoleInfo {
  roleId: string;
  roleName: string;
  permissions: { permissionId: string; permissionName: string | null }[];
}

interface ConflictExplanationInput {
  ruleName: string;
  riskDescription: string | null;
  severity: string;
  permissionA: { permissionId: string; permissionName: string | null };
  permissionB: { permissionId: string; permissionName: string | null };
  roleA: RoleInfo | null;
  roleB: RoleInfo | null;
}

export interface ConflictExplanation {
  riskSummary: string;
  fixAdvice: string;
  optionAImpact: string;
  optionBImpact: string;
}

// Common SOD pattern explanations keyed by permission-pair keywords
const PATTERN_EXPLANATIONS: Record<string, { riskTemplate: string; fixTemplate: string }> = {
  "create.*approve|approve.*create": {
    riskTemplate: "This user can both create and approve the same type of transaction, allowing a single person to commit fraud without independent oversight.",
    fixTemplate: "Remove either the creation role or the approval role to re-establish dual-control.",
  },
  "invoice.*payment|payment.*invoice": {
    riskTemplate: "This user can both post invoices and execute payments, giving them end-to-end control over cash disbursement without a segregation checkpoint.",
    fixTemplate: "Separate invoice processing from payment execution by removing one of the conflicting roles.",
  },
  "vendor.*invoice|vendor.*payment": {
    riskTemplate: "This user can manage vendor master data and process financial transactions against those vendors, creating a direct path for vendor fraud.",
    fixTemplate: "Remove either the vendor master maintenance role or the financial transaction role.",
  },
  "purchase.*goods|goods.*purchase": {
    riskTemplate: "This user can both create procurement commitments and confirm delivery, eliminating the independent verification that goods were actually received.",
    fixTemplate: "Separate procurement ordering from goods receipt confirmation by removing one role.",
  },
  "maintenance.*purchase|maintenance.*goods": {
    riskTemplate: "This user has both maintenance work authorization and procurement or inventory access, allowing them to inflate maintenance costs or redirect materials.",
    fixTemplate: "Separate maintenance operations from procurement/inventory management by removing the cross-domain role.",
  },
  "inventory.*adjust|count.*adjust|count.*post": {
    riskTemplate: "This user can both conduct inventory counts and post the resulting adjustments, giving them full control to conceal inventory shrinkage or theft.",
    fixTemplate: "Separate inventory counting responsibilities from inventory adjustment posting.",
  },
  "equipment.*maintenance|equipment.*order": {
    riskTemplate: "This user can manage equipment records and create work against those assets, bypassing the independent technical review that should separate asset setup from work authorization.",
    fixTemplate: "Separate equipment master data management from maintenance order creation.",
  },
};

/**
 * Generate a human-readable explanation for an SOD conflict.
 */
export function generateConflictExplanation(input: ConflictExplanationInput): ConflictExplanation {
  const { ruleName, riskDescription, severity, permissionA, permissionB, roleA, roleB } = input;

  // Build risk summary
  let riskSummary: string = `This user has conflicting permissions: "${permissionA.permissionName ?? permissionA.permissionId}" and "${permissionB.permissionName ?? permissionB.permissionId}". These two capabilities should be held by separate people to maintain proper segregation of duties.`;
  if (riskDescription) {
    // Use the SOD rule's own risk description as the primary explanation
    riskSummary = riskDescription;
  } else {
    // Try to match a pattern
    const combinedText = `${permissionA.permissionName ?? ""} ${permissionB.permissionName ?? ""} ${ruleName}`.toLowerCase();
    for (const [pattern, templates] of Object.entries(PATTERN_EXPLANATIONS)) {
      if (new RegExp(pattern, "i").test(combinedText)) {
        riskSummary = templates.riskTemplate;
        break;
      }
    }
  }

  // Build fix advice
  const roleAName = roleA?.roleName ?? "Role A";
  const roleBName = roleB?.roleName ?? "Role B";
  const permAName = permissionA.permissionName ?? permissionA.permissionId;
  const permBName = permissionB.permissionName ?? permissionB.permissionId;

  const fixAdvice = severity === "critical"
    ? `This is a CRITICAL conflict that must be resolved by removing one of the conflicting roles. Risk acceptance is not permitted. Remove "${roleAName}" to revoke "${permAName}" access, OR remove "${roleBName}" to revoke "${permBName}" access.`
    : `Remove "${roleAName}" to revoke "${permAName}" access, OR remove "${roleBName}" to revoke "${permBName}" access. Alternatively, if there is a valid business justification, submit a risk acceptance request for approver review.`;

  // Build impact descriptions
  const optionAImpact = buildImpactDescription(roleA, permissionA.permissionId);
  const optionBImpact = buildImpactDescription(roleB, permissionB.permissionId);

  return { riskSummary, fixAdvice, optionAImpact, optionBImpact };
}

function buildImpactDescription(role: RoleInfo | null, conflictingPermId: string): string {
  if (!role) return "Impact details unavailable — role information not found.";

  const otherPerms = role.permissions.filter(p => p.permissionId !== conflictingPermId);
  if (otherPerms.length === 0) {
    return `Removing "${role.roleName}" will only revoke the conflicting permission. No other access is affected.`;
  }

  const permList = otherPerms
    .map(p => p.permissionName ?? p.permissionId)
    .slice(0, 8)
    .join(", ");
  const moreCount = otherPerms.length > 8 ? ` and ${otherPerms.length - 8} more` : "";

  return `User will also lose access to: ${permList}${moreCount}`;
}

/**
 * Generate a pre-seeded risk explanation string for storage in the database.
 * Shorter than the full explanation — intended for quick display.
 */
export function generateSeedExplanation(
  riskDescription: string | null,
  permAName: string | null,
  permBName: string | null,
  roleAName: string | null,
  roleBName: string | null,
  severity: string,
): string {
  const risk = riskDescription
    ? riskDescription
    : `Conflicting access: "${permAName ?? "Permission A"}" and "${permBName ?? "Permission B"}" should be held by separate individuals.`;

  const resolution = severity === "critical"
    ? `Resolution required: Remove "${roleAName ?? "one role"}" or "${roleBName ?? "the other role"}". Risk acceptance is NOT permitted for critical conflicts.`
    : `Resolution options: Remove "${roleAName ?? "one role"}" or "${roleBName ?? "the other role"}", or submit a risk acceptance request with business justification.`;

  return `${risk}\n\n${resolution}`;
}
