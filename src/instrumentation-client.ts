import * as Sentry from "@sentry/nextjs";

/**
 * Browser runtime. Events go straight to Sentry's ingest host, which the CSP in
 * proxy.ts allows in connect-src.
 *
 * Replay records only sessions that hit an error: Clarity already records
 * ordinary sessions, and a second recorder on every page would double the
 * weight for footage nobody watches. Text and inputs are masked by default.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  // Scripts that Facebook/Instagram's in-app browsers inject into every page
  // (app://browser_declutter, app://navigation_performance_logger_android).
  // They throw on their own, in code we neither ship nor can fix.
  denyUrls: [/^app:\/\//],
  ignoreErrors: [/Java bridge method invocation error/],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
