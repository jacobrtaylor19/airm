import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

const detectIncidentMock = vi.fn(async () => 99);
vi.mock("@/lib/incidents/detection", () => ({
  detectIncident: (...a: unknown[]) => detectIncidentMock(...(a as [Parameters<typeof detectIncidentMock>[0]])),
  SYSTEM_ORG_ID: 0,
}));

vi.mock("@/lib/monitoring", () => ({
  reportError: vi.fn(),
  reportMessage: vi.fn(),
}));

import { POST } from "@/app/api/webhooks/sentry/route";

const TEST_SECRET = "test-secret-deadbeef";

function sign(body: string, secret = TEST_SECRET): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://app.provisum.io/api/webhooks/sentry", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
}

const VALID_PAYLOAD = JSON.stringify({
  action: "created",
  data: {
    issue: {
      id: "1234567890",
      shortId: "PROVISUM-ABC",
      title: "TypeError: undefined is not a function",
      culprit: "lib/foo.ts in bar",
      level: "error",
      permalink: "https://sentry.io/organizations/provisum/issues/1234567890/",
      project: { name: "javascript-nextjs" },
    },
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SENTRY_WEBHOOK_SECRET = TEST_SECRET;
});

afterEach(() => {
  delete process.env.SENTRY_WEBHOOK_SECRET;
});

describe("POST /api/webhooks/sentry — signature verification", () => {
  it("returns 401 when signature header is missing", async () => {
    const res = await POST(makeRequest(VALID_PAYLOAD));
    expect(res.status).toBe(401);
    expect(detectIncidentMock).not.toHaveBeenCalled();
  });

  it("returns 401 when signature is wrong", async () => {
    const res = await POST(makeRequest(VALID_PAYLOAD, { "sentry-hook-signature": "0".repeat(64) }));
    expect(res.status).toBe(401);
    expect(detectIncidentMock).not.toHaveBeenCalled();
  });

  it("returns 401 when signature length differs from expected (length-mismatch path)", async () => {
    const res = await POST(makeRequest(VALID_PAYLOAD, { "sentry-hook-signature": "short" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when SENTRY_WEBHOOK_SECRET env is not set", async () => {
    delete process.env.SENTRY_WEBHOOK_SECRET;
    const res = await POST(makeRequest(VALID_PAYLOAD, { "sentry-hook-signature": sign(VALID_PAYLOAD, "any") }));
    expect(res.status).toBe(401);
    expect(detectIncidentMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/webhooks/sentry — payload handling", () => {
  it("calls detectIncident with mapped fields on a valid 'created' event", async () => {
    const sig = sign(VALID_PAYLOAD);
    const res = await POST(makeRequest(VALID_PAYLOAD, { "sentry-hook-signature": sig }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.incidentId).toBe(99);
    expect(detectIncidentMock).toHaveBeenCalledTimes(1);
    const arg = detectIncidentMock.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.source).toBe("sentry");
    expect(arg.sourceRef).toBe("1234567890");
    expect(arg.severity).toBe("high"); // error → high
    expect((arg.title as string).startsWith("Sentry: TypeError")).toBe(true);
    expect((arg.metadata as Record<string, unknown>).sentryShortId).toBe("PROVISUM-ABC");
  });

  it("maps 'fatal' Sentry level to 'critical' severity", async () => {
    const payload = JSON.stringify({
      action: "created",
      data: { issue: { id: "1", title: "x", level: "fatal" } },
    });
    await POST(makeRequest(payload, { "sentry-hook-signature": sign(payload) }));
    const arg = detectIncidentMock.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.severity).toBe("critical");
  });

  it("returns 400 on invalid JSON even with valid signature", async () => {
    const body = "not json {";
    const res = await POST(makeRequest(body, { "sentry-hook-signature": sign(body) }));
    expect(res.status).toBe(400);
    expect(detectIncidentMock).not.toHaveBeenCalled();
  });

  it("returns 200 + ignored:true when payload has no data.issue", async () => {
    const payload = JSON.stringify({ action: "created", data: {} });
    const res = await POST(makeRequest(payload, { "sentry-hook-signature": sign(payload) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ignored).toBe(true);
    expect(detectIncidentMock).not.toHaveBeenCalled();
  });

  it("ignores actions other than created/regression", async () => {
    const payload = JSON.stringify({
      action: "resolved",
      data: { issue: { id: "1", title: "x", level: "error" } },
    });
    const res = await POST(makeRequest(payload, { "sentry-hook-signature": sign(payload) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ignored).toBe(true);
    expect(detectIncidentMock).not.toHaveBeenCalled();
  });
});
