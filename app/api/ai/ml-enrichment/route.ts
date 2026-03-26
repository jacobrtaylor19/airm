import { NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  buildMLProfile,
  enrichConfidence,
  getPersonaTargetRoles,
  isMLServiceAvailable,
} from "@/lib/ai/ml-enrichment";
import { safeError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/ml-enrichment
 *
 * Re-run ML confidence enrichment on all existing persona assignments
 * without re-running the Claude pipeline. Useful when the ML model has
 * been retrained or when assignments were imported without enrichment.
 *
 * Body (optional): { userIds?: number[] } — enrich specific users only.
 */
export async function POST(request: Request) {
  try {
    const available = await isMLServiceAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "ML sidecar not available. Start it with: python scripts/inference_xgboost.py --serve" },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const specificUserIds: number[] | undefined = body.userIds;

    // Get all assignments (or filtered ones)
    const assignments = specificUserIds
      ? db
          .select()
          .from(schema.userPersonaAssignments)
          .where(
            // drizzle doesn't have inArray for all versions, so filter in JS
            eq(schema.userPersonaAssignments.id, schema.userPersonaAssignments.id) // dummy — filter below
          )
          .all()
          .filter((a) => specificUserIds.includes(a.userId))
      : db.select().from(schema.userPersonaAssignments).all();

    // Need persona names
    const allPersonas = db.select().from(schema.personas).all();
    const personaNameById = new Map<number, string>();
    for (const p of allPersonas) {
      personaNameById.set(p.id, p.name);
    }

    let enriched = 0;
    let skipped = 0;
    let errored = 0;

    for (const assignment of assignments) {
      if (!assignment.personaId) {
        skipped++;
        continue;
      }

      const mlProfile = buildMLProfile(assignment.userId);
      if (!mlProfile) {
        skipped++;
        continue;
      }

      const personaName = personaNameById.get(assignment.personaId) || "";
      const targetRoles = getPersonaTargetRoles(assignment.personaId);

      try {
        const result = await enrichConfidence(mlProfile, {
          persona_name: personaName,
          confidence: assignment.confidenceScore ?? 50,
          target_roles: targetRoles,
        });

        if (result) {
          db.update(schema.userPersonaAssignments)
            .set({
              mlConfidence: result.ml_confidence,
              mlPersonaName: result.ml_persona.persona_name,
              mlAgreement: result.agreement,
              mlRecommendation: result.recommendation,
              compositeConfidence: result.composite_confidence,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(schema.userPersonaAssignments.id, assignment.id))
            .run();
          enriched++;
        } else {
          errored++;
        }
      } catch {
        errored++;
      }
    }

    db.insert(schema.auditLog)
      .values({
        entityType: "ml_enrichment",
        entityId: 0,
        action: "bulk_enrichment",
        newValue: JSON.stringify({ enriched, skipped, errored, total: assignments.length }),
      })
      .run();

    return NextResponse.json({ enriched, skipped, errored, total: assignments.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: safeError(err, "ML enrichment failed") }, { status: 500 });
  }
}

/**
 * GET /api/ai/ml-enrichment
 *
 * Check ML sidecar health and return enrichment stats.
 */
export async function GET() {
  const available = await isMLServiceAvailable();

  const stats = db
    .select()
    .from(schema.userPersonaAssignments)
    .all();

  const total = stats.length;
  const enrichedCount = stats.filter((a) => a.mlRecommendation !== null).length;
  const byRecommendation: Record<string, number> = {};
  for (const a of stats) {
    if (a.mlRecommendation) {
      byRecommendation[a.mlRecommendation] = (byRecommendation[a.mlRecommendation] || 0) + 1;
    }
  }

  return NextResponse.json({
    mlServiceAvailable: available,
    totalAssignments: total,
    enrichedAssignments: enrichedCount,
    byRecommendation,
  });
}
