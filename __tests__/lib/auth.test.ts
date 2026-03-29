import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

// Mock @/lib/supabase/server
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

// Mock @/db
vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

// Mock @/db/schema
vi.mock("@/db/schema", () => ({
  appUsers: {
    id: "id",
    username: "username",
    displayName: "displayName",
    email: "email",
    role: "role",
    assignedOrgUnitId: "assignedOrgUnitId",
    isActive: "isActive",
    supabaseAuthId: "supabaseAuthId",
  },
}));

import {
  ROLE_HIERARCHY,
  isSystemAdmin,
  isAdminOrAbove,
  requireAuth,
  requireRole,
  type AppUser,
} from "@/lib/auth";

describe("ROLE_HIERARCHY", () => {
  it("has system_admin as highest rank", () => {
    const max = Math.max(...Object.values(ROLE_HIERARCHY));
    expect(ROLE_HIERARCHY.system_admin).toBe(max);
  });

  it("has viewer as lowest rank", () => {
    const min = Math.min(...Object.values(ROLE_HIERARCHY));
    expect(ROLE_HIERARCHY.viewer).toBe(min);
  });

  it("orders roles correctly: system_admin > admin > project_manager > approver > coordinator > mapper > viewer", () => {
    expect(ROLE_HIERARCHY.system_admin).toBeGreaterThan(ROLE_HIERARCHY.admin);
    expect(ROLE_HIERARCHY.admin).toBeGreaterThan(ROLE_HIERARCHY.project_manager);
    expect(ROLE_HIERARCHY.project_manager).toBeGreaterThan(ROLE_HIERARCHY.approver);
    expect(ROLE_HIERARCHY.approver).toBeGreaterThan(ROLE_HIERARCHY.coordinator);
    expect(ROLE_HIERARCHY.coordinator).toBeGreaterThan(ROLE_HIERARCHY.mapper);
    expect(ROLE_HIERARCHY.mapper).toBeGreaterThan(ROLE_HIERARCHY.viewer);
  });

  it("contains all 7 roles", () => {
    expect(Object.keys(ROLE_HIERARCHY)).toHaveLength(7);
  });
});

describe("hasMinimumRole (via ROLE_HIERARCHY comparison)", () => {
  it("admin meets admin minimum", () => {
    expect(ROLE_HIERARCHY["admin"] >= ROLE_HIERARCHY["admin"]).toBe(true);
  });

  it("viewer does not meet mapper minimum", () => {
    expect(ROLE_HIERARCHY["viewer"] >= ROLE_HIERARCHY["mapper"]).toBe(false);
  });

  it("system_admin meets any minimum", () => {
    for (const role of Object.keys(ROLE_HIERARCHY)) {
      expect(ROLE_HIERARCHY["system_admin"] >= ROLE_HIERARCHY[role]).toBe(true);
    }
  });
});

describe("isSystemAdmin", () => {
  it("returns true for system_admin role", () => {
    const user = { role: "system_admin" } as AppUser;
    expect(isSystemAdmin(user)).toBe(true);
  });

  it("returns false for admin role", () => {
    const user = { role: "admin" } as AppUser;
    expect(isSystemAdmin(user)).toBe(false);
  });
});

describe("isAdminOrAbove", () => {
  it("returns true for admin", () => {
    expect(isAdminOrAbove({ role: "admin" } as AppUser)).toBe(true);
  });

  it("returns true for system_admin", () => {
    expect(isAdminOrAbove({ role: "system_admin" } as AppUser)).toBe(true);
  });

  it("returns false for mapper", () => {
    expect(isAdminOrAbove({ role: "mapper" } as AppUser)).toBe(false);
  });
});

describe("requireAuth", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  it("redirects to /login when no session exists", async () => {
    await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});

describe("requireRole", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
  });

  it("redirects to /login when no session (before checking role)", async () => {
    await expect(requireRole(["admin"])).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });
});
