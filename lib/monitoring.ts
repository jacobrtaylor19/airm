/**
 * Structured logging and error reporting via Sentry.
 *
 * All log output is structured JSON for aggregation in Vercel logs.
 * Sentry captures exceptions and messages when DSN is configured.
 */

import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  context?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, correlationId?: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(correlationId && { correlationId }),
    ...(context && Object.keys(context).length > 0 && { context }),
  };

  const formatted = formatLog(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      // Only log debug in development
      if (process.env.NODE_ENV === "development") {
        console.debug(formatted);
      }
      break;
    default:
      console.log(formatted);
  }
}

/** Report an error to Sentry + structured log */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  log("error", message, undefined, { ...context, stack: err instanceof Error ? err.stack : undefined });
  Sentry.captureException(err, { extra: context });
}

/** Report a message to Sentry + structured log */
export function reportMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: Record<string, unknown>,
): void {
  log(level === "warning" ? "warn" : level, message, undefined, context);
  Sentry.captureMessage(message, { level, extra: context });
}

/** Set user context for Sentry */
export function setUserContext(user: { id: string; username: string; role: string }): void {
  Sentry.setUser({
    id: user.id,
    username: user.username,
    data: { role: user.role },
  });
}

/** Clear user context from Sentry */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Create a scoped logger with a fixed correlation ID.
 * Use at the start of an API route or background job to correlate all logs.
 *
 * @example
 * const logger = withCorrelationId();
 * logger.info("Processing request", { userId: 123 });
 * logger.error("Failed to process", { error: err.message });
 */
export function withCorrelationId(id?: string) {
  const correlationId = id ?? crypto.randomUUID();

  return {
    correlationId,
    debug: (message: string, context?: Record<string, unknown>) =>
      log("debug", message, correlationId, context),
    info: (message: string, context?: Record<string, unknown>) =>
      log("info", message, correlationId, context),
    warn: (message: string, context?: Record<string, unknown>) =>
      log("warn", message, correlationId, context),
    error: (message: string, context?: Record<string, unknown>) =>
      log("error", message, correlationId, context),
    /** Report error to Sentry with correlation ID in context */
    reportError: (err: unknown, context?: Record<string, unknown>) => {
      const msg = err instanceof Error ? err.message : String(err);
      log("error", msg, correlationId, { ...context, stack: err instanceof Error ? err.stack : undefined });
      Sentry.captureException(err, { extra: { ...context, correlationId } });
    },
  };
}
