/**
 * Application monitoring and error reporting via Sentry.
 *
 * Wraps Sentry calls so the rest of the codebase has a single import point.
 * When NEXT_PUBLIC_SENTRY_DSN is not set, falls back to console logging.
 */

import * as Sentry from "@sentry/nextjs";

export function reportError(err: unknown, context?: Record<string, unknown>): void {
  console.error("[ERROR]", err, context ? JSON.stringify(context) : "");

  Sentry.captureException(err, {
    extra: context,
  });
}

export function reportMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>,
): void {
  console.log(`[${level.toUpperCase()}]`, message, context ? JSON.stringify(context) : "");

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

export function setUserContext(user: { id: string; username: string; role: string }): void {
  Sentry.setUser({
    id: user.id,
    username: user.username,
    // Store role as custom data
    data: { role: user.role },
  });
}

export function clearUserContext(): void {
  Sentry.setUser(null);
}
