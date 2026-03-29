import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @supabase/ssr
const mockGetUser = vi.fn();
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Minimal NextRequest / NextResponse mocks
function createMockRequest(pathname: string) {
  const url = `http://localhost:3000${pathname}`;
  return {
    nextUrl: { pathname },
    url,
    cookies: {
      getAll: vi.fn(() => []),
      set: vi.fn(),
    },
  };
}

const mockHeaders = {
  set: vi.fn(),
  get: vi.fn(),
};

const mockResponseCookies = {
  set: vi.fn(),
};

vi.mock("next/server", () => {
  return {
    NextRequest: vi.fn(),
    NextResponse: {
      next: vi.fn(() => ({
        headers: { ...mockHeaders, set: vi.fn() },
        cookies: { ...mockResponseCookies, set: vi.fn() },
      })),
      redirect: vi.fn((url: URL) => ({
        headers: { ...mockHeaders, set: vi.fn() },
        cookies: { ...mockResponseCookies, set: vi.fn() },
        _redirectUrl: url.toString(),
      })),
    },
  };
});

import { middleware } from "@/middleware";
import { NextResponse } from "next/server";

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  describe("static assets pass through", () => {
    it("passes through /_next/static paths", async () => {
      const req = createMockRequest("/_next/static/chunk.js");
      const result = await middleware(req as any);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it("passes through /favicon.ico", async () => {
      const req = createMockRequest("/favicon.ico");
      const result = await middleware(req as any);
      expect(NextResponse.next).toHaveBeenCalled();
    });

    it("passes through files with extensions (e.g. /logo.png)", async () => {
      const req = createMockRequest("/logo.png");
      await middleware(req as any);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe("public exact paths pass through", () => {
    for (const path of ["/", "/login", "/setup", "/methodology", "/overview", "/quick-reference"]) {
      it(`allows ${path} without authentication`, async () => {
        const req = createMockRequest(path);
        await middleware(req as any);
        expect(NextResponse.redirect).not.toHaveBeenCalled();
      });
    }
  });

  describe("public prefix paths pass through", () => {
    it("allows /api/auth/login", async () => {
      const req = createMockRequest("/api/auth/login");
      await middleware(req as any);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it("allows /api/health", async () => {
      const req = createMockRequest("/api/health");
      await middleware(req as any);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it("allows /review/abc123", async () => {
      const req = createMockRequest("/review/abc123");
      await middleware(req as any);
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe("protected paths redirect to /login when no session", () => {
    it("redirects /dashboard to /login", async () => {
      const req = createMockRequest("/dashboard");
      await middleware(req as any);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0];
      expect(redirectCall[0].toString()).toContain("/login");
    });

    it("redirects /admin to /login", async () => {
      const req = createMockRequest("/admin");
      await middleware(req as any);
      expect(NextResponse.redirect).toHaveBeenCalled();
    });
  });

  describe("regression: /setupadmin is NOT treated as public", () => {
    it("does not match /setupadmin as public (prefix-safety check)", async () => {
      const req = createMockRequest("/setupadmin");
      await middleware(req as any);
      // /setupadmin is not in PUBLIC_EXACT and doesn't start with any PUBLIC_PREFIXES
      // so it should require auth and redirect
      expect(NextResponse.redirect).toHaveBeenCalled();
    });
  });
});
