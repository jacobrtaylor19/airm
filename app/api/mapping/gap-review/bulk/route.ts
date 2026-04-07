import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";

export const dynamic = "force-dynamic";

/**
 * POST /api/mapping/gap-review/bulk
 * Bulk confirm multiple users' access changes as-is.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin", "mapper"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const orgId = getOrgId(user);
  const body = await request.json();
  const { userIds, notes } = body as { userIds?: number[]; notes?: string };

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "userIds array is required" }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();
    let confirmed = 0;

    // Process in batches of 50
    for (let i = 0; i < userIds.length; i += 50) {
      const batch = userIds.slice(i, i + 50);

      for (const userId of batch) {
        // Compute gap data per user
        const gapData = await db.execute(sql`
          WITH src AS (
            SELECT count(DISTINCT sp.permission_id) AS cnt,
                   array_agg(DISTINCT sp.permission_id) AS ids
            FROM user_source_role_assignments usra
            JOIN source_role_permissions srp ON srp.source_role_id = usra.source_role_id
            JOIN source_permissions sp ON sp.id = srp.source_permission_id
            WHERE usra.user_id = ${userId}
          ),
          tgt AS (
            SELECT count(DISTINCT tp.permission_id) AS cnt,
                   array_agg(DISTINCT tp.permission_id) AS ids
            FROM user_target_role_assignments utra
            JOIN target_role_permissions trp ON trp.target_role_id = utra.target_role_id
            JOIN target_permissions tp ON tp.id = trp.target_permission_id
            WHERE utra.user_id = ${userId}
          ),
          src_roles AS (
            SELECT count(DISTINCT source_role_id) AS cnt FROM user_source_role_assignments WHERE user_id = ${userId}
          ),
          tgt_roles AS (
            SELECT count(DISTINCT target_role_id) AS cnt FROM user_target_role_assignments WHERE user_id = ${userId}
          )
          SELECT
            COALESCE(src.cnt, 0)::int AS source_perm_count,
            COALESCE(tgt.cnt, 0)::int AS target_perm_count,
            COALESCE(src_roles.cnt, 0)::int AS source_role_count,
            COALESCE(tgt_roles.cnt, 0)::int AS target_role_count,
            COALESCE(
              (SELECT count(*) FROM unnest(src.ids) AS sid
               WHERE sid NOT IN (SELECT unnest(COALESCE(tgt.ids, ARRAY[]::text[])))),
              0
            )::int AS uncovered_count,
            COALESCE(
              (SELECT count(*) FROM unnest(tgt.ids) AS tid
               WHERE tid NOT IN (SELECT unnest(COALESCE(src.ids, ARRAY[]::text[])))),
              0
            )::int AS new_perm_count
          FROM src, tgt, src_roles, tgt_roles
        `);

        const row = (gapData as unknown as Record<string, unknown>[])[0];
        const sourcePermCount = Number(row?.source_perm_count ?? 0);
        const uncoveredCount = Number(row?.uncovered_count ?? 0);
        const coveragePercent = sourcePermCount > 0
          ? Math.round(((sourcePermCount - uncoveredCount) / sourcePermCount) * 100)
          : 100;
        const lossRatio = sourcePermCount > 0 ? uncoveredCount / sourcePermCount : 0;
        const changeImpactLevel = uncoveredCount === 0
          ? "none"
          : lossRatio > 0.3 || uncoveredCount > 20
          ? "high"
          : lossRatio > 0.1 || uncoveredCount > 5
          ? "medium"
          : "low";

        await db.execute(sql`
          INSERT INTO user_gap_reviews (user_id, organization_id, review_status, change_impact_level,
            coverage_percent, uncovered_count, new_perm_count, source_role_count, target_role_count,
            reviewed_by, reviewed_at, review_notes, updated_at)
          VALUES (${userId}, ${orgId}, 'confirmed_as_is', ${changeImpactLevel},
            ${coveragePercent}, ${uncoveredCount}, ${Number(row?.new_perm_count ?? 0)},
            ${Number(row?.source_role_count ?? 0)}, ${Number(row?.target_role_count ?? 0)},
            ${user.id}, ${now}, ${notes ?? null}, ${now})
          ON CONFLICT (organization_id, user_id) DO UPDATE SET
            review_status = 'confirmed_as_is',
            change_impact_level = ${changeImpactLevel},
            coverage_percent = ${coveragePercent},
            uncovered_count = ${uncoveredCount},
            new_perm_count = ${Number(row?.new_perm_count ?? 0)},
            source_role_count = ${Number(row?.source_role_count ?? 0)},
            target_role_count = ${Number(row?.target_role_count ?? 0)},
            reviewed_by = ${user.id},
            reviewed_at = ${now},
            review_notes = ${notes ?? null},
            updated_at = ${now}
        `);
        confirmed++;
      }
    }

    return NextResponse.json({ success: true, confirmed });
  } catch (error) {
    console.error("[gap-review-bulk] Failed:", error);
    return NextResponse.json(
      { error: "Bulk gap review failed", detail: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
