import * as Sentry from "@sentry/nextjs";

// Edge runtime (the proxy). Same privacy stance as sentry.server.config.ts.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});
