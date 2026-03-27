import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/setup", "/methodology", "/overview", "/quick-reference", "/api/auth/login", "/api/auth/setup", "/api/auth/logout", "/review", "/api/health"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (pathname === "/" || PUBLIC_PATHS.some((p) => p !== "/" && pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Known authenticated routes — only redirect to login for these
  const AUTHENTICATED_PREFIXES = [
    "/dashboard", "/admin", "/personas", "/mapping", "/sod", "/sod-rules",
    "/approvals", "/users", "/upload", "/data", "/exports", "/jobs",
    "/source-roles", "/target-roles", "/releases", "/audit-log",
    "/least-access", "/inbox", "/notifications", "/unauthorized",
    "/api/admin", "/api/ai", "/api/approvals", "/api/assistant",
    "/api/exports", "/api/jobs", "/api/least-access", "/api/mapping",
    "/api/notifications", "/api/org-hierarchy", "/api/personas",
    "/api/refinements", "/api/releases", "/api/review-links",
    "/api/settings", "/api/sod", "/api/sod-rules", "/api/upload",
  ];

  const isAuthRoute = AUTHENTICATED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isAuthRoute) {
    const sessionToken = request.cookies.get("airm_session")?.value;
    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-XSS-Protection", "1; mode=block");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  const scriptSrc = process.env.NODE_ENV === "production"
    ? "script-src 'self' 'unsafe-inline'" // Next.js requires unsafe-inline for __NEXT_DATA__ hydration scripts
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self' https://api.anthropic.com",
      "frame-ancestors 'none'",
    ].join("; ") + ";"
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
