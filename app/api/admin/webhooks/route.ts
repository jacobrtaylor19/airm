import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { getWebhookEndpoints, getWebhookDeliveries, WEBHOOK_EVENT_TYPES } from "@/lib/webhooks";
import { reportError } from "@/lib/monitoring";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const endpointId = req.nextUrl.searchParams.get("endpointId");

  try {
    if (endpointId) {
      const deliveries = await getWebhookDeliveries(parseInt(endpointId, 10));
      return NextResponse.json({ deliveries });
    }

    const endpoints = await getWebhookEndpoints();
    return NextResponse.json({ endpoints, eventTypes: WEBHOOK_EVENT_TYPES });
  } catch (err) {
    reportError(err, { route: "GET /api/admin/webhooks" });
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { url, description, events, enabled } = body;

    if (!url || typeof url !== "string" || !url.startsWith("https://")) {
      return NextResponse.json({ error: "url must be a valid HTTPS URL" }, { status: 400 });
    }
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "events must be a non-empty array" }, { status: 400 });
    }

    const secret = crypto.randomBytes(32).toString("hex");
    const now = new Date().toISOString();

    const [endpoint] = await db
      .insert(schema.webhookEndpoints)
      .values({
        url,
        description: description || null,
        secret,
        events: JSON.stringify(events),
        enabled: enabled !== false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({ endpoint: { ...endpoint, secret } });
  } catch (err) {
    reportError(err, { route: "POST /api/admin/webhooks" });
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, url, description, events, enabled } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (url !== undefined) updates.url = url;
    if (description !== undefined) updates.description = description;
    if (events !== undefined) updates.events = JSON.stringify(events);
    if (enabled !== undefined) updates.enabled = enabled;

    await db
      .update(schema.webhookEndpoints)
      .set(updates)
      .where(eq(schema.webhookEndpoints.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    reportError(err, { route: "PATCH /api/admin/webhooks" });
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["system_admin", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Delete deliveries first, then endpoint
    await db.delete(schema.webhookDeliveries).where(eq(schema.webhookDeliveries.endpointId, id));
    await db.delete(schema.webhookEndpoints).where(eq(schema.webhookEndpoints.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    reportError(err, { route: "DELETE /api/admin/webhooks" });
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }
}
