import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getScheduledExports,
  calculateNextRun,
  EXPORT_TYPES,
  type ExportSchedule,
} from "@/lib/scheduled-exports";
import { reportError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const exports = await getScheduledExports();
    return NextResponse.json({ exports, exportTypes: EXPORT_TYPES });
  } catch (err) {
    reportError(err, { route: "GET /api/admin/scheduled-exports" });
    return NextResponse.json({ error: "Failed to fetch scheduled exports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, exportType, schedule, dayOfWeek, dayOfMonth, hour, enabled } = body;

    if (!name || !exportType || !schedule) {
      return NextResponse.json({ error: "name, exportType, and schedule are required" }, { status: 400 });
    }

    const validSchedules = ["daily", "weekly", "monthly"];
    if (!validSchedules.includes(schedule)) {
      return NextResponse.json({ error: "Invalid schedule" }, { status: 400 });
    }

    const validTypes = EXPORT_TYPES.map((t) => t.value);
    if (!validTypes.includes(exportType)) {
      return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    const nextRun = calculateNextRun(
      schedule as ExportSchedule,
      hour ?? 6,
      dayOfWeek,
      dayOfMonth,
    );
    const now = new Date().toISOString();

    const [created] = await db
      .insert(schema.scheduledExports)
      .values({
        name,
        exportType,
        schedule,
        dayOfWeek: dayOfWeek ?? null,
        dayOfMonth: dayOfMonth ?? null,
        hour: hour ?? 6,
        enabled: enabled !== false,
        nextRunAt: nextRun,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({ export: created });
  } catch (err) {
    reportError(err, { route: "POST /api/admin/scheduled-exports" });
    return NextResponse.json({ error: "Failed to create scheduled export" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, schedule, dayOfWeek, dayOfMonth, hour, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (schedule !== undefined) updates.schedule = schedule;
    if (dayOfWeek !== undefined) updates.dayOfWeek = dayOfWeek;
    if (dayOfMonth !== undefined) updates.dayOfMonth = dayOfMonth;
    if (hour !== undefined) updates.hour = hour;
    if (enabled !== undefined) updates.enabled = enabled;

    // Recalculate next run if schedule changed
    if (schedule !== undefined || hour !== undefined || dayOfWeek !== undefined || dayOfMonth !== undefined) {
      const [current] = await db
        .select()
        .from(schema.scheduledExports)
        .where(eq(schema.scheduledExports.id, id));
      if (current) {
        updates.nextRunAt = calculateNextRun(
          (schedule ?? current.schedule) as ExportSchedule,
          hour ?? current.hour,
          dayOfWeek ?? current.dayOfWeek,
          dayOfMonth ?? current.dayOfMonth,
        );
      }
    }

    await db
      .update(schema.scheduledExports)
      .set(updates)
      .where(eq(schema.scheduledExports.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    reportError(err, { route: "PATCH /api/admin/scheduled-exports" });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await db.delete(schema.scheduledExports).where(eq(schema.scheduledExports.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    reportError(err, { route: "DELETE /api/admin/scheduled-exports" });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
