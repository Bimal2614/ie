import * as Sentry from "@sentry/nextjs";

/**
 * Node.js runtime. Loaded by register() in instrumentation.ts.
 *
 * No `dataCollection` and no `includeLocalVariables`, deliberately: both widen
 * what leaves the app — cookies (the session cookie), request bodies (answers,
 * passwords on the auth actions), and the local variables of whatever frame
 * threw. The stack trace, route and release are what a fix needs.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
