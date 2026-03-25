import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

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
 * Login rate limit: 5 attempts per 15 minutes per IP.
 */
export function checkLoginRate(req: NextRequest): NextResponse | null {
  const ip = getClientIP(req);
  const { allowed, remaining, resetAt } = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) return rateLimitResponse(resetAt, remaining);
  return null;
}

/**
 * AI endpoint rate limit: 10 requests per minute per user.
 */
export function checkAIRate(req: NextRequest, userId: string): NextResponse | null {
  const { allowed, remaining, resetAt } = rateLimit(`ai:${userId}`, 10, 60 * 1000);
  if (!allowed) return rateLimitResponse(resetAt, remaining);
  return null;
}

/**
 * Bulk operation rate limit: 5 requests per minute per user.
 */
export function checkBulkRate(req: NextRequest, userId: string): NextResponse | null {
  const { allowed, remaining, resetAt } = rateLimit(`bulk:${userId}`, 5, 60 * 1000);
  if (!allowed) return rateLimitResponse(resetAt, remaining);
  return null;
}
