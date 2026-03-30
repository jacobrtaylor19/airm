import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, lte } from "drizzle-orm";

export type ExportSchedule = "daily" | "weekly" | "monthly";
export type ExportType = "excel" | "csv_users" | "csv_mappings" | "csv_sod" | "provisioning";

export const EXPORT_TYPES: { value: ExportType; label: string }[] = [
  { value: "excel", label: "Full Excel Report" },
  { value: "csv_users", label: "Users CSV" },
  { value: "csv_mappings", label: "Role Mappings CSV" },
  { value: "csv_sod", label: "SOD Conflicts CSV" },
  { value: "provisioning", label: "Provisioning Export" },
];

/**
 * Calculate the next run time based on schedule config.
 */
export function calculateNextRun(
  schedule: ExportSchedule,
  hour: number,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
): string {
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(hour);

  if (schedule === "daily") {
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  } else if (schedule === "weekly") {
    const targetDay = dayOfWeek ?? 1; // default Monday
    const currentDay = next.getUTCDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && next <= now)) daysUntil += 7;
    next.setUTCDate(next.getUTCDate() + daysUntil);
  } else if (schedule === "monthly") {
    const targetDate = dayOfMonth ?? 1;
    next.setUTCDate(targetDate);
    if (next <= now) next.setUTCMonth(next.getUTCMonth() + 1);
  }

  return next.toISOString();
}

/**
 * Get all scheduled exports.
 */
export async function getScheduledExports() {
  return db.select().from(schema.scheduledExports).orderBy(schema.scheduledExports.name);
}

/**
 * Get exports that are due to run.
 */
export async function getDueExports() {
  const now = new Date().toISOString();
  return db
    .select()
    .from(schema.scheduledExports)
    .where(
      and(
        eq(schema.scheduledExports.enabled, true),
        lte(schema.scheduledExports.nextRunAt, now),
      ),
    );
}

/**
 * Mark an export as completed and calculate next run.
 */
export async function markExportCompleted(
  id: number,
  status: "success" | "failed",
  error?: string,
) {
  const [current] = await db
    .select()
    .from(schema.scheduledExports)
    .where(eq(schema.scheduledExports.id, id));

  if (!current) return;

  const nextRun = calculateNextRun(
    current.schedule as ExportSchedule,
    current.hour,
    current.dayOfWeek,
    current.dayOfMonth,
  );

  await db
    .update(schema.scheduledExports)
    .set({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: status,
      lastRunError: error ?? null,
      nextRunAt: nextRun,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.scheduledExports.id, id));
}
