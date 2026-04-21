/**
 * POST /api/webhooks/sentry
 *
 * Inbound webhook from a Sentry Internal Integration. Verifies the
 * Sentry-Hook-Signature, maps the event to an incident, and lets the
 * existing detection pipeline (dedup + AI triage + admin notify) run.
 *
 * Setup: in Sentry, create an Internal Integration with the
 * `issue.created` and `issue.resolved` alert subscriptions, set the
 * webhook URL to https://app.provisum.io/api/webhooks/sentry, and copy
 * the integration's Client Secret into the SENTRY_WEBHOOK_SECRET env var.
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { detectIncident } from "@/lib/incidents/detection";
import { reportError, reportMessage } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

type SentryLevel = "fatal" | "error" | "warning" | "info" | "debug";
type Severity = "critical" | "high" | "medium" | "low";

const LEVEL_TO_SEVERITY: Record<SentryLevel, Severity> = {
  fatal: "critical",
  error: "high",
  warning: "medium",
  info: "low",
  debug: "low",
};

interface SentryWebhookPayload {
  action?: string;
  data?: {
    issue?: {
      id?: string | number;
      shortId?: string;
      title?: string;
      culprit?: string;
      level?: SentryLevel;
      permalink?: string;
      project?: { name?: string };
      metadata?: Record<string, unknown>;
    };
  };
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("sentry-hook-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SentryWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const issue = payload.data?.issue;
  if (!issue?.id || !issue?.title) {
    reportMessage("[sentry-webhook] Payload missing data.issue.id or title — ignoring", "warning");
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Only act on creation/regression events; ignore resolution events for v1
  // (Provisum-side admin lifecycle is independent of Sentry's).
  if (payload.action && !["created", "regression"].includes(payload.action)) {
    return NextResponse.json({ ok: true, ignored: true, reason: `action=${payload.action}` });
  }

  const severity = LEVEL_TO_SEVERITY[issue.level ?? "error"] ?? "medium";

  try {
    const id = await detectIncident({
      title: `Sentry: ${issue.title}`.slice(0, 500),
      description: [
        issue.culprit ? `Culprit: ${issue.culprit}` : null,
        issue.permalink ? `Sentry: ${issue.permalink}` : null,
        issue.project?.name ? `Project: ${issue.project.name}` : null,
      ].filter(Boolean).join("\n") || `Sentry issue ${issue.shortId ?? issue.id}`,
      severity,
      source: "sentry",
      sourceRef: String(issue.id),
      metadata: {
        sentryShortId: issue.shortId ?? null,
        sentryPermalink: issue.permalink ?? null,
        sentryLevel: issue.level ?? null,
        sentryAction: payload.action ?? null,
      },
    });

    return NextResponse.json({ ok: true, incidentId: id });
  } catch (err) {
    reportError(err instanceof Error ? err : new Error(String(err)), {
      route: "POST /api/webhooks/sentry",
      sentryIssueId: issue.id,
    });
    return NextResponse.json({ error: "Failed to record incident" }, { status: 500 });
  }
}
