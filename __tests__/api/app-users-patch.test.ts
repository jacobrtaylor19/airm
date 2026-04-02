import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock auth ──────────────────────────────────────────────────────
const mockGetSessionUser = vi.fn();
vi.mock("@/lib/auth", () => ({
  getSessionUser: () => mockGetSessionUser(),
}));

// ─── Mock audit ─────────────────────────────────────────────────────
const mockAuditLog = vi.fn();
vi.mock("@/lib/audit", () => ({
  auditLog: (...args: unknown[]) => mockAuditLog(...args),
}));

// ─── Chainable DB mock ──────────────────────────────────────────────
const mockUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateSetWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

vi.mock("@/db", () => ({
  db: {
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock("@/db/schema", () => ({
  appUsers: { id: "id", role: "role", isActive: "is_active" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
}));

// Import the handler
import { PATCH } from "@/app/api/admin/app-users/[id]/route";
import { NextRequest } from "next/server";

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/app-users/1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/admin/app-users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 if user is not authenticated", async () => {
    mockGetSessionUser.mockResolvedValueOnce(null);

    const res = await PATCH(
      createRequest({ role: "mapper" }),
      { params: { id: "1" } }
    );

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin or system_admin", async () => {
    mockGetSessionUser.mockResolvedValueOnce({
      role: "mapper",
      organizationId: 1,
      email: "mapper@test.com",
    });

    const res = await PATCH(
      createRequest({ role: "viewer" }),
      { params: { id: "1" } }
    );

    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid user ID", async () => {
    mockGetSessionUser.mockResolvedValueOnce({
      role: "admin",
      organizationId: 1,
      email: "admin@test.com",
    });

    const res = await PATCH(
      createRequest({ role: "mapper" }),
      { params: { id: "abc" } }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid user ID");
  });

  it("returns 400 for invalid role", async () => {
    mockGetSessionUser.mockResolvedValueOnce({
      role: "admin",
      organizationId: 1,
      email: "admin@test.com",
    });

    const res = await PATCH(
      createRequest({ role: "superadmin" }),
      { params: { id: "5" } }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid role");
  });

  it("accepts valid role change", async () => {
    mockGetSessionUser.mockResolvedValueOnce({
      role: "admin",
      organizationId: 1,
      email: "admin@test.com",
    });

    const res = await PATCH(
      createRequest({ role: "mapper" }),
      { params: { id: "5" } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockAuditLog).toHaveBeenCalled();
  });

  it("accepts valid deactivation", async () => {
    mockGetSessionUser.mockResolvedValueOnce({
      role: "system_admin",
      organizationId: 1,
      email: "sysadmin@test.com",
    });

    const res = await PATCH(
      createRequest({ isActive: false }),
      { params: { id: "3" } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("accepts valid reactivation", async () => {
    mockGetSessionUser.mockResolvedValueOnce({
      role: "admin",
      organizationId: 1,
      email: "admin@test.com",
    });

    const res = await PATCH(
      createRequest({ isActive: true }),
      { params: { id: "3" } }
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 when no valid updates provided", async () => {
    mockGetSessionUser.mockResolvedValueOnce({
      role: "admin",
      organizationId: 1,
      email: "admin@test.com",
    });

    const res = await PATCH(
      createRequest({}),
      { params: { id: "5" } }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("No valid updates provided");
  });

  it("accepts all valid role values", async () => {
    const validRoles = [
      "system_admin", "admin", "project_manager", "coordinator",
      "mapper", "approver", "viewer", "compliance_officer", "security_architect",
    ];

    for (const role of validRoles) {
      vi.clearAllMocks();
      mockGetSessionUser.mockResolvedValueOnce({
        role: "system_admin",
        organizationId: 1,
        email: "admin@test.com",
      });

      const res = await PATCH(
        createRequest({ role }),
        { params: { id: "5" } }
      );

      expect(res.status).toBe(200);
    }
  });

  it("audit logs the change with metadata", async () => {
    mockGetSessionUser.mockResolvedValueOnce({
      role: "admin",
      organizationId: 1,
      email: "admin@test.com",
    });

    await PATCH(
      createRequest({ role: "approver" }),
      { params: { id: "7" } }
    );

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 1,
        entityType: "appUser",
        entityId: 7,
        action: "user_updated",
        actorEmail: "admin@test.com",
        metadata: { role: "approver" },
      })
    );
  });
});
