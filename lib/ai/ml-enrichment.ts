/**
 * ML Confidence Enrichment Layer — sidecar client.
 *
 * Calls the Python XGBoost inference server (ml/scripts/inference_xgboost.py --serve)
 * to enrich Claude zero-shot persona assignments with a second opinion.
 *
 * Graceful degradation: if the sidecar is unreachable, returns null so the
 * pipeline continues with Claude-only confidence. No hard dependency.
 */

import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSetting } from "@/lib/settings";

const DEFAULT_ML_URL = "http://localhost:8081";

export interface MLUserProfile {
  user_id: string;
  job_title: string;
  department: string;
  sub_department?: string;
  source_roles: string[];
  tcodes: string[];
  industry?: string;
  seniority?: number;
}

export interface MLEnrichmentResult {
  ml_persona: {
    persona_name: string;
    confidence: number;
    top_3: { persona: string; confidence: number }[];
  };
  ml_roles: {
    target_roles: string[];
    role_probabilities: Record<string, number>;
    borderline_roles: string[];
  };
  composite_confidence: number;
  agreement: "full" | "partial" | "disagreement";
  recommendation: "auto_confirm" | "soft_confirm" | "review" | "block";
  existing_confidence: number;
  ml_confidence: number;
  _inference_ms: number;
}

function getMLServiceUrl(): string {
  return getSetting("ml.serviceUrl") || process.env.ML_SERVICE_URL || DEFAULT_ML_URL;
}

/**
 * Check if the ML sidecar is running and healthy.
 */
export async function isMLServiceAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${getMLServiceUrl()}/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Build the ML-compatible user profile from the app's DB records.
 *
 * Maps the Next.js schema (userId, source role assignments, permissions)
 * into the flat dict the Python model expects.
 */
export function buildMLProfile(userId: number): MLUserProfile | null {
  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user) return null;

  // Source role IDs
  const roleAssignments = db
    .select({ roleId: schema.sourceRoles.roleId })
    .from(schema.userSourceRoleAssignments)
    .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.userSourceRoleAssignments.sourceRoleId))
    .where(eq(schema.userSourceRoleAssignments.userId, userId))
    .all();

  const sourceRoles = roleAssignments.map((r) => r.roleId);

  // TCodes (permissions) for those roles
  const tcodes: string[] = [];
  for (const role of roleAssignments) {
    const perms = db
      .select({ permissionId: schema.sourcePermissions.permissionId })
      .from(schema.sourceRolePermissions)
      .innerJoin(schema.sourcePermissions, eq(schema.sourcePermissions.id, schema.sourceRolePermissions.sourcePermissionId))
      .innerJoin(schema.sourceRoles, eq(schema.sourceRoles.id, schema.sourceRolePermissions.sourceRoleId))
      .where(eq(schema.sourceRoles.roleId, role.roleId))
      .all();
    for (const p of perms) {
      if (!tcodes.includes(p.permissionId)) tcodes.push(p.permissionId);
    }
  }

  return {
    user_id: user.sourceUserId,
    job_title: user.jobTitle || "",
    department: user.department || "",
    source_roles: sourceRoles,
    tcodes,
  };
}

/**
 * Call the ML sidecar's /enrich endpoint.
 *
 * Takes a user profile and the Claude pipeline's assignment, returns
 * composite confidence + recommendation. Returns null if sidecar is down.
 */
export async function enrichConfidence(
  userProfile: MLUserProfile,
  existingAssignment: {
    persona_name: string;
    confidence: number;
    target_roles: string[];
  }
): Promise<MLEnrichmentResult | null> {
  const url = getMLServiceUrl();
  try {
    const res = await fetch(`${url}/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: userProfile,
        existing_assignment: existingAssignment,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.warn(`[ML] Enrichment failed: ${res.status} ${res.statusText}`);
      return null;
    }

    return (await res.json()) as MLEnrichmentResult;
  } catch (err) {
    console.warn(`[ML] Sidecar unreachable at ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Get persona-to-target-role mappings for a given persona name.
 * Used to build the existing_assignment payload for enrichment.
 */
export function getPersonaTargetRoles(personaId: number): string[] {
  const mappings = db
    .select({ roleId: schema.targetRoles.roleId })
    .from(schema.personaTargetRoleMappings)
    .innerJoin(schema.targetRoles, eq(schema.targetRoles.id, schema.personaTargetRoleMappings.targetRoleId))
    .where(eq(schema.personaTargetRoleMappings.personaId, personaId))
    .all();
  return mappings.map((m) => m.roleId);
}
