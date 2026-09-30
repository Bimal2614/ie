import type { Instrumentation } from "next";

/**
 * Every unhandled server error — a page that 500s, a route handler that throws,
 * a server action that crashes, the database going away — reaches Slack.
 *
 * The call sites that expect failure (AI scoring, payments, mail) alert
 * themselves with a precise message; this is the net under everything else.
 * notFound() and redirect() are control flow, not errors, and never arrive here,
 * so 404s do not page.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const message = err instanceof Error ? err.message : String(err);
  // A browser tab left open across a deploy posts to a server action the new
  // build no longer has. That is a stale client, not a fault — it clears on
  // reload, and would otherwise page after every release.
  if (/Failed to find Server Action/i.test(message)) return;

  const { alert } = await import("@/lib/monitoring/alert");
  await alert({
    source: "server-error",
    title: `Unhandled ${context.routeType} error on ${context.routePath}`,
    error: err,
    // The query string can carry reset and verification tokens — path only.
    context: {
      method: request.method,
      path: request.path.split("?")[0],
      digest: (err as { digest?: string }).digest,
    },
    key: `server-error|${context.routePath}|${message.slice(0, 120)}`,
  });
};
