import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";

function getClientIP(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function rateLimitResponse(resetAt: number, remaining: number): NextResponse {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": String(remaining),
      },
    }
  );
}

/**
 * Login rate limit: per IP.
 */
export function checkLoginRate(req: NextRequest): NextResponse | null {
  const ip = getClientIP(req);
  const { allowed, remaining, resetAt } = rateLimit(
    `login:${ip}`,
    RATE_LIMITS.LOGIN_LIMIT,
    RATE_LIMITS.LOGIN_WINDOW_MS
  );
  if (!allowed) return rateLimitResponse(resetAt, remaining);
  return null;
}

/**
 * AI endpoint rate limit: per user.
 */
export function checkAIRate(req: NextRequest, userId: string): NextResponse | null {
  const { allowed, remaining, resetAt } = rateLimit(
    `ai:${userId}`,
    RATE_LIMITS.AI_LIMIT,
    RATE_LIMITS.AI_WINDOW_MS
  );
  if (!allowed) return rateLimitResponse(resetAt, remaining);
  return null;
}

/**
 * Bulk operation rate limit: per user.
 */
export function checkBulkRate(req: NextRequest, userId: string): NextResponse | null {
  const { allowed, remaining, resetAt } = rateLimit(
    `bulk:${userId}`,
    RATE_LIMITS.BULK_LIMIT,
    RATE_LIMITS.BULK_WINDOW_MS
  );
  if (!allowed) return rateLimitResponse(resetAt, remaining);
  return null;
}
