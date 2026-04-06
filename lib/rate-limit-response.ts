/**
 * Helper for applying in-memory IP rate limiting to Next.js API route handlers.
 *
 * Usage in a route handler:
 *
 *   import { withRateLimit } from "@/lib/rate-limit-response";
 *   import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-memory";
 *
 *   export async function POST(req: NextRequest) {
 *     const limited = withRateLimit(req, RATE_LIMIT_PRESETS.AUTH);
 *     if (limited) return limited;
 *     // ... handle request
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  type RateLimitOptions,
} from "@/lib/rate-limit-memory";

/**
 * Apply IP-based rate limiting to a request.
 *
 * @returns A 429 NextResponse if the client is over the limit, or `null`
 *          if the request should proceed.
 */
export function withRateLimit(
  req: NextRequest,
  config: Omit<RateLimitOptions, "identifier"> = {}
): NextResponse | null {
  const ip = getClientIp((name) => req.headers.get(name));
  const pathname = new URL(req.url).pathname;
  const identifier = `ip:${ip}:${pathname}`;

  const result = checkRateLimit({
    ...config,
    identifier,
  });

  if (!result.success) {
    const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(retryAfterSec, 1)),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      }
    );
  }

  return null;
}
