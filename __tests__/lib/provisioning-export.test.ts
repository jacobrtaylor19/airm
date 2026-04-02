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
  users: { id: "id", sourceUserId: "source_user_id", displayName: "display_name", email: "email", department: "department" },
  targetRoles: { id: "id", roleId: "role_id", roleName: "role_name" },
  userTargetRoleAssignments: { userId: "user_id", targetRoleId: "target_role_id", status: "status" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
}));

import { generateProvisioningCsv } from "@/lib/exports/provisioning-export";

describe("generateProvisioningCsv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes branded header with date", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const csv = await generateProvisioningCsv();

    expect(csv).toContain("# Provisum Provisioning Export");
    expect(csv).toContain("Generated");
    // Verify date format (YYYY-MM-DD)
    expect(csv).toMatch(/Generated \d{4}-\d{2}-\d{2}/);
  });

  it("includes branded subheader", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const csv = await generateProvisioningCsv();

    expect(csv).toContain("# Approved role assignments ready for provisioning");
  });

  it("includes employee_id, email, and department in header", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const csv = await generateProvisioningCsv();
    const lines = csv.split("\n");
    const headerLine = lines[2]; // 0 = branded, 1 = subheader, 2 = column header

    expect(headerLine).toContain("employee_id");
    expect(headerLine).toContain("email");
    expect(headerLine).toContain("department");
    expect(headerLine).toContain("display_name");
    expect(headerLine).toContain("target_role_id");
    expect(headerLine).toContain("target_role_name");
    expect(headerLine).toContain("status");
  });

  it("formats data rows correctly", async () => {
    mockWhere.mockResolvedValueOnce([
      {
        sourceUserId: "U001",
        displayName: "John Doe",
        email: "john@test.com",
        department: "Finance",
        targetRoleId: "TR001",
        targetRoleName: "AP Clerk",
        status: "approved",
      },
    ]);

    const csv = await generateProvisioningCsv();
    const lines = csv.split("\n");

    expect(lines.length).toBe(4); // branded + subheader + header + 1 data row
    expect(lines[3]).toContain("U001");
    expect(lines[3]).toContain("John Doe");
    expect(lines[3]).toContain("john@test.com");
    expect(lines[3]).toContain("Finance");
    expect(lines[3]).toContain("AP Clerk");
  });

  it("handles null email and department gracefully", async () => {
    mockWhere.mockResolvedValueOnce([
      {
        sourceUserId: "U002",
        displayName: "Jane Smith",
        email: null,
        department: null,
        targetRoleId: "TR002",
        targetRoleName: "GL Accountant",
        status: "approved",
      },
    ]);

    const csv = await generateProvisioningCsv();

    // Should not crash and should contain empty strings for nulls
    expect(csv).toContain("U002");
    expect(csv).toContain("Jane Smith");
  });

  it("escapes CSV values with commas", async () => {
    mockWhere.mockResolvedValueOnce([
      {
        sourceUserId: "U003",
        displayName: "Doe, Jane",
        email: "jane@test.com",
        department: "Finance, Ops",
        targetRoleId: "TR003",
        targetRoleName: "Manager",
        status: "approved",
      },
    ]);

    const csv = await generateProvisioningCsv();

    expect(csv).toContain('"Doe, Jane"');
    expect(csv).toContain('"Finance, Ops"');
  });

  it("returns only headers when no approved assignments exist", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const csv = await generateProvisioningCsv();
    const lines = csv.split("\n");

    expect(lines.length).toBe(3); // branded + subheader + header only
  });
});
