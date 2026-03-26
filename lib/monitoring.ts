/**
 * Application monitoring and error reporting.
 *
 * Currently logs to console. When Sentry is configured (SENTRY_DSN env var),
 * install @sentry/nextjs and update this module to report errors.
 *
 * TODO: Install Sentry when DSN is available:
 *   pnpm add @sentry/nextjs
 *   npx @sentry/wizard@latest -i nextjs
 *   Update reportError() to call Sentry.captureException()
 */

export function reportError(err: unknown, context?: Record<string, unknown>): void {
  console.error("[ERROR]", err, context ? JSON.stringify(context) : "");

  // TODO: When Sentry is configured:
  // import * as Sentry from "@sentry/nextjs";
  // Sentry.captureException(err, { extra: context });
}
