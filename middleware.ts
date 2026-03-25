import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/setup", "/methodology", "/overview", "/api/auth/login", "/api/auth/setup", "/api/auth/logout", "/review"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (pathname === "/" || PUBLIC_PATHS.some((p) => p !== "/" && pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = request.cookies.get("airm_session")?.value;
  if (!sessionToken) {
    // Redirect to login (or setup if no users exist)
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
