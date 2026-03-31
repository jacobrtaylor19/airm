import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { reportError, reportMessage } from "@/lib/monitoring";
import { detectIncident } from "@/lib/incidents/detection";
import crypto from "crypto";

// Supported event types
export type WebhookEventType =
  | "persona.generated"
  | "mapping.created"
  | "mapping.approved"
  | "mapping.rejected"
  | "sod.analysis_complete"
  | "sod.conflict_resolved"
  | "assignment.status_changed"
  | "export.completed"
  | "user.invited"
  | "job.completed"
  | "job.failed";

export const WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
  "persona.generated",
  "mapping.created",
  "mapping.approved",
  "mapping.rejected",
  "sod.analysis_complete",
  "sod.conflict_resolved",
  "assignment.status_changed",
  "export.completed",
  "user.invited",
  "job.completed",
  "job.failed",
];

interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Dispatch a webhook event to all subscribed endpoints.
 * This is fire-and-forget — failures are logged but don't block the caller.
 */
export async function dispatchWebhookEvent(
  eventType: WebhookEventType,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    // Find all enabled endpoints subscribed to this event
    const endpoints = await db
      .select()
      .from(schema.webhookEndpoints)
      .where(
        and(
          eq(schema.webhookEndpoints.enabled, true),
          sql`${schema.webhookEndpoints.failureCount} < 10`,
        ),
      );

    const subscribedEndpoints = endpoints.filter((ep) => {
      const events: string[] = JSON.parse(ep.events);
      return events.includes(eventType) || events.includes("*");
    });

    if (subscribedEndpoints.length === 0) return;

    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };
    const payloadStr = JSON.stringify(payload);

    // Deliver to each endpoint concurrently
    const deliveries = subscribedEndpoints.map(async (endpoint) => {
      const [delivery] = await db
        .insert(schema.webhookDeliveries)
        .values({
          endpointId: endpoint.id,
          eventType,
          payload: payloadStr,
          status: "pending",
          attempts: 0,
        })
        .returning({ id: schema.webhookDeliveries.id });

      await deliverWebhook(endpoint, payloadStr, delivery.id);
    });

    await Promise.allSettled(deliveries);
  } catch (err) {
    reportError(err, { context: "dispatchWebhookEvent", eventType });
  }
}

async function deliverWebhook(
  endpoint: typeof schema.webhookEndpoints.$inferSelect,
  payloadStr: string,
  deliveryId: number,
): Promise<void> {
  const signature = signPayload(payloadStr, endpoint.secret);
  const now = new Date().toISOString();

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
        "X-Webhook-Event": JSON.parse(payloadStr).event,
        "User-Agent": "Provisum-Webhooks/1.0",
      },
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    const responseBody = await response.text().catch(() => "");
    const status = response.ok ? "delivered" : "failed";

    await db
      .update(schema.webhookDeliveries)
      .set({
        status,
        httpStatus: response.status,
        responseBody: responseBody.slice(0, 1000),
        attempts: 1,
      })
      .where(eq(schema.webhookDeliveries.id, deliveryId));

    if (response.ok) {
      await db
        .update(schema.webhookEndpoints)
        .set({ lastSuccessAt: now, failureCount: 0, updatedAt: now })
        .where(eq(schema.webhookEndpoints.id, endpoint.id));
    } else {
      await db
        .update(schema.webhookEndpoints)
        .set({
          lastFailureAt: now,
          failureCount: sql`${schema.webhookEndpoints.failureCount} + 1`,
          updatedAt: now,
        })
        .where(eq(schema.webhookEndpoints.id, endpoint.id));

      reportMessage(`Webhook delivery failed: ${endpoint.url} returned ${response.status}`, "warning", {
        endpointId: endpoint.id,
        deliveryId,
      });

      // Check if endpoint just hit the auto-disable threshold (10 failures)
      if (endpoint.failureCount + 1 >= 10) {
        detectIncident({
          title: `Webhook endpoint disabled: ${endpoint.url}`,
          description: `Endpoint auto-disabled after 10 consecutive failures. Last HTTP status: ${response.status}.`,
          severity: "medium",
          source: "webhook_failure",
          sourceRef: String(endpoint.id),
          affectedComponent: "integration",
        }).catch(() => {});
      }
    }
  } catch (err) {
    await db
      .update(schema.webhookDeliveries)
      .set({ status: "failed", attempts: 1, responseBody: String(err).slice(0, 1000) })
      .where(eq(schema.webhookDeliveries.id, deliveryId));

    await db
      .update(schema.webhookEndpoints)
      .set({
        lastFailureAt: now,
        failureCount: sql`${schema.webhookEndpoints.failureCount} + 1`,
        updatedAt: now,
      })
      .where(eq(schema.webhookEndpoints.id, endpoint.id));

    reportError(err, { context: "deliverWebhook", endpointId: endpoint.id, deliveryId });

    // Check if endpoint just hit the auto-disable threshold (10 failures)
    if (endpoint.failureCount + 1 >= 10) {
      detectIncident({
        title: `Webhook endpoint disabled: ${endpoint.url}`,
        description: `Endpoint auto-disabled after 10 consecutive failures. Last error: ${String(err).slice(0, 200)}`,
        severity: "medium",
        source: "webhook_failure",
        sourceRef: String(endpoint.id),
        affectedComponent: "integration",
      }).catch(() => {});
    }
  }
}

/**
 * Get all webhook endpoints (for admin UI).
 */
export async function getWebhookEndpoints() {
  return db.select().from(schema.webhookEndpoints).orderBy(schema.webhookEndpoints.createdAt);
}

/**
 * Get recent deliveries for an endpoint.
 */
export async function getWebhookDeliveries(endpointId: number, limit = 50) {
  return db
    .select()
    .from(schema.webhookDeliveries)
    .where(eq(schema.webhookDeliveries.endpointId, endpointId))
    .orderBy(sql`${schema.webhookDeliveries.createdAt} DESC`)
    .limit(limit);
}
