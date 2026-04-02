import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Chainable DB mock ──────────────────────────────────────────────
const mockWhere = vi.fn();
const mockInnerJoin2 = vi.fn(() => ({ where: mockWhere }));
const mockInnerJoin1 = vi.fn(() => ({ innerJoin: mockInnerJoin2 }));
const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin1 }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  users: { id: "id", displayName: "display_name", sourceUserId: "source_user_id" },
  sodConflicts: {
    userId: "user_id", sodRuleId: "sod_rule_id", severity: "severity",
    permissionIdA: "permission_id_a", permissionIdB: "permission_id_b",
    resolutionStatus: "resolution_status", resolutionNotes: "resolution_notes",
    resolvedBy: "resolved_by", resolvedAt: "resolved_at",
    mitigatingControl: "mitigating_control", controlOwner: "control_owner",
    controlFrequency: "control_frequency",
  },
  sodRules: { id: "id", ruleName: "rule_name" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
}));

import { generateSodExceptionCsv } from "@/lib/exports/sod-exception-report";

describe("generateSodExceptionCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes branded header with date", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const csv = await generateSodExceptionCsv();

    expect(csv).toContain("# Provisum SOD Exception Report");
    expect(csv).toMatch(/Generated \d{4}-\d{2}-\d{2}/);
  });

  it("includes branded subheader about mitigating controls", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const csv = await generateSodExceptionCsv();

    expect(csv).toContain("# Accepted SOD risk exceptions with mitigating controls");
  });

  it("includes mitigating_control, control_owner, control_frequency columns", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const csv = await generateSodExceptionCsv();
    const lines = csv.split("\n");
    const headerLine = lines[2]; // 0 = branded, 1 = subheader, 2 = column header

    expect(headerLine).toContain("mitigating_control");
    expect(headerLine).toContain("control_owner");
    expect(headerLine).toContain("control_frequency");
  });

  it("renders mitigating control data in rows", async () => {
    mockWhere.mockResolvedValueOnce([
      {
        userName: "Alice Smith",
        userId: "U100",
        severity: "high",
        ruleName: "AP-GL Separation",
        permissionA: "AP_POST",
        permissionB: "GL_POST",
        resolution: "risk_accepted",
        justification: "Low volume, supervised",
        resolvedBy: "admin",
        resolvedAt: "2026-04-01",
        mitigatingControl: "Monthly reconciliation review",
        controlOwner: "CFO",
        controlFrequency: "monthly",
      },
    ]);

    const csv = await generateSodExceptionCsv();
    const lines = csv.split("\n");
    const dataRow = lines[3];

    expect(dataRow).toContain("Monthly reconciliation review");
    expect(dataRow).toContain("CFO");
    expect(dataRow).toContain("monthly");
    expect(dataRow).toContain("Alice Smith");
    expect(dataRow).toContain("AP-GL Separation");
  });

  it("handles null mitigating control fields gracefully", async () => {
    mockWhere.mockResolvedValueOnce([
      {
        userName: "Bob Jones",
        userId: "U200",
        severity: "critical",
        ruleName: "PO-Approve Separation",
        permissionA: "PO_CREATE",
        permissionB: "PO_APPROVE",
        resolution: "risk_accepted",
        justification: "Temporary",
        resolvedBy: "admin",
        resolvedAt: "2026-04-02",
        mitigatingControl: null,
        controlOwner: null,
        controlFrequency: null,
      },
    ]);

    const csv = await generateSodExceptionCsv();

    // Should not throw and should contain the data
    expect(csv).toContain("Bob Jones");
    expect(csv.split("\n").length).toBe(4);
  });

  it("returns only headers when no accepted risks exist", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const csv = await generateSodExceptionCsv();
    const lines = csv.split("\n");

    expect(lines.length).toBe(3); // branded + subheader + header
  });
});
