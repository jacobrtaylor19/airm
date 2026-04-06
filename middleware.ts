import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Exact-match public pages (no prefix matching — prevents accidental exposure)
const PUBLIC_EXACT = new Set(["/", "/login", "/setup", "/methodology", "/overview", "/quick-reference", "/accept-terms"]);

// Prefix-match public API routes and paths with known sub-routes
const PUBLIC_PREFIXES = ["/api/auth/", "/api/health", "/api/cron/", "/review/", "/api/admin/users/invite/accept", "/api/demo/"];

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    // Allow static assets and Next.js internals (no Supabase call needed)
    if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
      return NextResponse.next();
    }

    // Allow public paths — still refresh session (keeps JWT fresh for subsequent nav)
    const isPublic = PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
    if (isPublic) {
      return addSecurityHeaders(await updateSession(request, NextResponse.next()));
    }

    // All non-public, non-static routes require authentication
    let response = NextResponse.next({ request });
    const supabase = createSupabaseMiddlewareClient(request, response);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    return addSecurityHeaders(response);
  } catch (err) {
    // Log the actual error for debugging middleware crashes
    console.error("[middleware] Error:", err instanceof Error ? err.message : String(err));
    // Fail open for public paths, fail closed for protected
    const { pathname } = request.nextUrl;
    const isPublic = PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
    if (isPublic) {
      return addSecurityHeaders(NextResponse.next());
    }
    return addSecurityHeaders(NextResponse.redirect(new URL("/login", request.url)));
  }
}

/**
 * Creates a Supabase client that can read/write cookies in middleware context.
 */
function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

/**
 * Refreshes the Supabase session for public paths (keeps JWT fresh for subsequent nav).
 */
async function updateSession(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const supabase = createSupabaseMiddlewareClient(request, response);
  await supabase.auth.getUser();
  return response;
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
      "connect-src 'self' https://api.anthropic.com https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; ") + ";"
  );

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
