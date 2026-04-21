import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────
const mockLimit = vi.fn();
const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockLeftJoin = vi.fn(() => ({ where: mockWhere }));
const mockFrom = vi.fn(() => ({ leftJoin: mockLeftJoin }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));
const mockInsertValues = vi.fn(async () => undefined);
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

vi.mock("@/db", () => ({
  db: {
    select: () => mockSelect(),
    insert: () => mockInsert(),
  },
}));

vi.mock("@/db/schema", () => ({
  incidents: {
    id: "id", title: "title", description: "description", severity: "severity",
    status: "status", source: "source", sourceRef: "sourceRef",
    aiClassification: "aiClassification", aiTriagedAt: "aiTriagedAt",
    resolution: "resolution", resolvedBy: "resolvedBy", resolvedAt: "resolvedAt",
    affectedComponent: "affectedComponent", affectedUsers: "affectedUsers",
    metadata: "metadata", organizationId: "organizationId",
    createdAt: "createdAt", updatedAt: "updatedAt",
  },
  appUsers: { id: "appUsers.id", displayName: "appUsers.displayName" },
  auditLog: { /* shape doesn't matter for the mock */ },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => "eq-cond"),
  and: vi.fn((...args: unknown[]) => ["and", ...args]),
  gt: vi.fn(() => "gt-cond"),
  desc: vi.fn(() => "desc"),
  sql: Object.assign(
    (strings: TemplateStringsArray, ..._values: unknown[]) => `sql:${strings.join("?")}`,
    { raw: (s: string) => s },
  ),
}));

vi.mock("@/lib/monitoring", () => ({
  reportError: vi.fn(),
  reportMessage: vi.fn(),
}));

const validateApiKeyMock = vi.fn();
vi.mock("@/lib/integration-auth", () => ({
  validateApiKey: (req: Request) => validateApiKeyMock(req),
}));

vi.mock("@/lib/incidents/detection", () => ({
  SYSTEM_ORG_ID: 0,
}));

// ── Helpers ────────────────────────────────────────────────────────
function makeRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

import { GET } from "@/app/api/integration/v1/incidents/route";

beforeEach(() => {
  vi.clearAllMocks();
  validateApiKeyMock.mockReturnValue(true);
});

describe("GET /api/integration/v1/incidents — auth", () => {
  it("returns 401 when validateApiKey returns false", async () => {
    validateApiKeyMock.mockReturnValueOnce(false);
    const res = await GET(makeRequest("https://app.provisum.io/api/integration/v1/incidents"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("does not query the DB on 401", async () => {
    validateApiKeyMock.mockReturnValueOnce(false);
    await GET(makeRequest("https://app.provisum.io/api/integration/v1/incidents"));
    expect(mockSelect).not.toHaveBeenCalled();
  });
});

describe("GET /api/integration/v1/incidents — query params", () => {
  it("returns 400 on invalid 'since'", async () => {
    const res = await GET(makeRequest("https://x/?since=notadate"));
    expect(res.status).toBe(400);
  });

  it("returns 400 on negative 'limit'", async () => {
    const res = await GET(makeRequest("https://x/?limit=-5"));
    expect(res.status).toBe(400);
  });

  it("returns 400 on non-integer 'organizationId'", async () => {
    const res = await GET(makeRequest("https://x/?organizationId=foo"));
    expect(res.status).toBe(400);
    expect(mockLimit).not.toHaveBeenCalled();
  });
});

describe("GET /api/integration/v1/incidents — happy path", () => {
  it("returns empty list with hasMore=false on no rows", async () => {
    mockLimit.mockResolvedValueOnce([]);
    const res = await GET(makeRequest("https://x/api/integration/v1/incidents"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.incidents).toEqual([]);
    expect(body.pageInfo.hasMore).toBe(false);
    expect(typeof body.pageInfo.nextSince).toBe("string");
    expect(body._meta.systemOrgId).toBe(0);
  });

  it("writes an audit_log row recording the read (SOC 2 CC6.1)", async () => {
    mockLimit.mockResolvedValueOnce([]);
    await GET(makeRequest("https://x/api/integration/v1/incidents?limit=50"));
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledTimes(1);
    const audit = mockInsertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(audit.entityType).toBe("integration");
    expect(audit.action).toBe("incidents.read");
    expect(audit.actorEmail).toBe("mgmt-suite@integration");
    const newValue = JSON.parse(audit.newValue as string) as Record<string, unknown>;
    expect(newValue.limit).toBe(50);
    expect(newValue.returned).toBe(0);
    expect(newValue.hasMore).toBe(false);
  });

  it("does NOT audit-log when auth fails", async () => {
    validateApiKeyMock.mockReturnValueOnce(false);
    await GET(makeRequest("https://x/api/integration/v1/incidents"));
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("scrubs PII and sets containsPii=true when description has an email", async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: 71,
        title: "Manual incident",
        description: "Reporter user@example.com submitted",
        severity: "medium",
        status: "open",
        source: "manual",
        sourceRef: null,
        aiClassification: null,
        aiTriagedAt: null,
        resolution: null,
        resolvedBy: null,
        resolvedByName: null,
        resolvedAt: null,
        affectedComponent: "ai_pipeline",
        affectedUsers: 50000,
        metadata: null,
        organizationId: 1,
        createdAt: "2026-04-21T16:14:09.000Z",
        updatedAt: "2026-04-21T16:14:09.000Z",
      },
    ]);
    const res = await GET(makeRequest("https://x/api/integration/v1/incidents"));
    const body = await res.json();
    expect(body.incidents).toHaveLength(1);
    expect(body.incidents[0].description).toBe("Reporter <redacted-email> submitted");
    expect(body.incidents[0].containsPii).toBe(true);
  });

  it("parses aiClassification and metadata JSON strings", async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: 42,
        title: "x",
        description: "y",
        severity: "high",
        status: "investigating",
        source: "job_failure",
        sourceRef: "1843",
        aiClassification: '{"category":"ai_pipeline","rootCause":"r","suggestedFix":"f","confidence":80,"blastRadius":"organization"}',
        aiTriagedAt: "2026-04-21T09:01:44.000Z",
        resolution: null,
        resolvedBy: null,
        resolvedByName: null,
        resolvedAt: null,
        affectedComponent: "ai_pipeline",
        affectedUsers: null,
        metadata: '{"jobId":1843}',
        organizationId: 0,
        createdAt: "2026-04-21T09:00:55.000Z",
        updatedAt: "2026-04-21T09:18:02.000Z",
      },
    ]);
    const res = await GET(makeRequest("https://x/api/integration/v1/incidents"));
    const body = await res.json();
    expect(body.incidents[0].aiClassification).toEqual({
      category: "ai_pipeline",
      rootCause: "r",
      suggestedFix: "f",
      confidence: 80,
      blastRadius: "organization",
    });
    expect(body.incidents[0].metadata).toEqual({ jobId: 1843 });
    expect(body.incidents[0].organizationId).toBe(0);
  });

  it("scrubs PII from aiClassification.rootCause and flips containsPii", async () => {
    mockLimit.mockResolvedValueOnce([
      {
        id: 88,
        title: "Manual",
        description: "clean text",
        severity: "low",
        status: "open",
        source: "manual",
        sourceRef: null,
        aiClassification: '{"category":"configuration","rootCause":"User reported via email user@example.com","suggestedFix":"call them at 415-555-1234","confidence":50,"blastRadius":"isolated"}',
        aiTriagedAt: "2026-04-21T09:01:44.000Z",
        resolution: null,
        resolvedBy: null,
        resolvedByName: null,
        resolvedAt: null,
        affectedComponent: null,
        affectedUsers: null,
        metadata: null,
        organizationId: 1,
        createdAt: "2026-04-21T09:00:00.000Z",
        updatedAt: "2026-04-21T09:00:00.000Z",
      },
    ]);
    const res = await GET(makeRequest("https://x/api/integration/v1/incidents"));
    const body = await res.json();
    expect(body.incidents[0].aiClassification.rootCause).toBe("User reported via email <redacted-email>");
    expect(body.incidents[0].aiClassification.suggestedFix).toContain("<redacted-phone>");
    expect(body.incidents[0].containsPii).toBe(true);
  });

  it("computes hasMore=true when more rows than limit", async () => {
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      title: `t${i}`,
      description: "d",
      severity: "low",
      status: "open",
      source: "manual",
      sourceRef: null,
      aiClassification: null,
      aiTriagedAt: null,
      resolution: null,
      resolvedBy: null,
      resolvedByName: null,
      resolvedAt: null,
      affectedComponent: null,
      affectedUsers: null,
      metadata: null,
      organizationId: 1,
      createdAt: "2026-04-21T00:00:00.000Z",
      updatedAt: `2026-04-21T0${i}:00:00.000Z`,
    }));
    mockLimit.mockResolvedValueOnce(rows);
    const res = await GET(makeRequest("https://x/api/integration/v1/incidents?limit=2"));
    const body = await res.json();
    expect(body.incidents).toHaveLength(2);
    expect(body.pageInfo.hasMore).toBe(true);
    expect(body.pageInfo.nextSince).toBe("2026-04-21T01:00:00.000Z");
  });
});
