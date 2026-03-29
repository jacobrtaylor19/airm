import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring sample rate
  tracesSampleRate: 1.0,

  // Only initialize if DSN is provided
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
