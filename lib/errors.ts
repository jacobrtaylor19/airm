import crypto from "crypto";

/**
 * Return a safe error message for API responses.
 * In development, returns the actual error message.
 * In production, returns a generic fallback to prevent information leakage.
 */
export function safeError(err: unknown, fallback = "An unexpected error occurred"): string {
  if (process.env.NODE_ENV === "development") {
    return err instanceof Error ? err.message : String(err);
  }
  return fallback;
}

/**
 * Generate a short correlation ID for error tracking.
 * Included in error responses so users can reference specific errors in support requests.
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID().slice(0, 8);
}
