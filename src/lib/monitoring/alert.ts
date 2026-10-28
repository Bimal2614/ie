import "server-only";

import * as Sentry from "@sentry/nextjs";

import { env, isProd } from "@/lib/env";

/**
 * Tell a human, now, that something in production broke.
 *
 * WHY THIS EXISTS. Almost every failure path in this app is deliberately
 * non-throwing: a scoring outage leaves a null band, a failed webhook asks
 * Razorpay to retry, a mail that bounces returns `{ ok: false }`. That is the
 * right behaviour for the candidate and the worst possible one for noticing —
 * the only trace is a log line in a dashboard nobody has open. The daily smoke
 * test catches a dead provider within the day; this catches it on the first
 * real answer it costs us.
 *
 * ONE FUNCTION, CALLED FROM THE FAILURE BRANCH. Every call is also written to
 * the log and to Sentry (see `record`), so callers need not log it again. It
 * never throws and gives up after a few seconds, so an alert about an outage can
 * never become a second outage.
 *
 * DEDUPED PER INSTANCE. A provider that is down fails every answer of every
 * candidate, and one Slack message per answer is how an alert channel gets
 * muted. The same `key` is sent at most once per `COOLDOWN_MS` from one warm
 * instance, and the next one says how many were held back. Several instances
 * can each send one — a handful of duplicates, never hundreds.
 *
 * PRODUCTION ONLY by default, because `.env.local` carries the same webhook and
 * a dev server throwing on every save would drown the real ones. Set
 * `ALERTS_IN_DEV=1` to try it locally.
 */

export type AlertSeverity = "critical" | "warning";

export type AlertInput = {
  /** Which part of the system: "writing-ai", "speaking-ai", "razorpay-webhook", "server-error", … */
  source: string;
  /** One line: what happened, in words a human reads at a glance. */
  title: string;
  /** Defaults to critical. Warnings are things to look at today, not now. */
  severity?: AlertSeverity;
  /** HTTP status from the upstream, when there was one. */
  status?: number;
  /** The upstream's own message or body — the part that says WHY. Truncated. */
  detail?: string;
  /** A caught error; its message and the top of its stack go into the report. */
  error?: unknown;
  /** Ids and labels that let you find the row or the request. Never PII or essay text. */
  context?: Record<string, string | number | boolean | null | undefined>;
  /** What most likely caused it and what to do. Derived from status/detail when omitted. */
  hint?: string;
  /** Dedupe key. Defaults to source + title + status. */
  key?: string;
};

const COOLDOWN_MS = 10 * 60_000;
const SEND_TIMEOUT_MS = 4_000;

const recent = new Map<string, { sentAt: number; held: number }>();

export async function alert(input: AlertInput): Promise<void> {
  record(input);
  try {
    const url = env.SLACK_WEBHOOK_URL;
    if (!url) return;
    if (!isProd && env.ALERTS_IN_DEV !== "1") return;

    const key = input.key ?? `${input.source}|${input.title}|${input.status ?? ""}`;
    const now = Date.now();
    const seen = recent.get(key);
    if (seen && now - seen.sentAt < COOLDOWN_MS) {
      seen.held++;
      return;
    }
    const held = seen?.held ?? 0;
    recent.set(key, { sentAt: now, held: 0 });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: render(input, held), mrkdwn: true }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!res.ok) console.error(`[alert] Slack rejected the alert: ${res.status}`);
  } catch (e) {
    // Never let the pager take the page down with it.
    console.error("[alert] could not send", e instanceof Error ? e.message : e);
  }
}

/**
 * The durable record of every alert: one log line and one Sentry event.
 *
 * Slack is the page, and it is deduped and production-only, so it is not the
 * record. These failures are handled, not thrown, so Sentry never sees them on
 * its own — a provider outage would otherwise leave nothing searchable once the
 * Slack message scrolls away. Sentry counts every occurrence; the fingerprint
 * is the dedupe key, so one cause stays one issue. "server-error" is skipped
 * there because onRequestError already captured the same error with its stack.
 */
function record(a: AlertInput): void {
  try {
    const detail = a.detail ?? (a.error !== undefined ? errorMessage(a.error) : undefined);
    const key = a.key ?? `${a.source}|${a.title}|${a.status ?? ""}`;
    const level = (a.severity ?? "critical") === "critical" ? "error" : "warning";
    console[level === "error" ? "error" : "warn"](`[alert:${a.source}] ${a.title}`, {
      status: a.status,
      detail: detail ? clip(detail, 2000) : undefined,
      ...a.context,
    });
    if (a.source === "server-error") return;

    const error = a.error instanceof Error ? a.error : raisedHere(a);
    Sentry.withScope((scope) => {
      scope.setLevel(level);
      scope.setFingerprint(["alert", key]);
      scope.setTag("alert.source", a.source);
      if (a.status !== undefined) scope.setTag("http.status", String(a.status));
      scope.setContext("alert", { status: a.status, detail: detail ? clip(detail, 4000) : undefined, ...a.context });
      scope.setExtra("title", a.title);
      // A caught error already carries the stack of where it was thrown. A
      // handled failure (a provider's 500 returned as a value) has none, so one
      // is made with this file cut off the top: the issue then points at the
      // caller that raised it.
      Sentry.captureException(error);
    });
  } catch {
    // Recording must never break the caller either.
  }
}

/**
 * An Error whose stack starts at alert()'s caller. Must be called directly from
 * record(), which alert() calls before its first await — so the top three frames
 * are always raisedHere, record and alert, whatever the bundler names them.
 */
function raisedHere(a: AlertInput): Error {
  const e = new Error(a.title);
  e.name = a.source;
  if (e.stack) {
    const [head, ...frames] = e.stack.split("\n");
    e.stack = [head, ...frames.slice(3)].join("\n");
  }
  return e;
}

/**
 * A plain-English guess at the cause, from the status and the provider's body.
 *
 * The provider body is the only thing that tells "out of credit" from "too many
 * requests" — both are 429 at OpenAI — so it is read before the status.
 */
export function explainFailure(status?: number, detail?: string): string {
  const d = (detail ?? "").toLowerCase();
  if (/insufficient_quota|billing|credit|balance|quota exceeded|payment required/.test(d) || status === 402) {
    return "💳 Out of credit / quota exhausted — top up the account balance or raise the spend limit.";
  }
  if (status === 429 || /rate.?limit|too many requests/.test(d)) {
    return "🚦 Rate limited — too many requests for the plan's limit. Usually clears on its own; raise the tier if it keeps happening.";
  }
  if (status === 401 || status === 403 || /invalid.*key|unauthori[sz]ed|forbidden/.test(d)) {
    return "🔑 Rejected credentials — the API key is wrong, revoked or rotated. Check the env var on Vercel.";
  }
  if (/model.*(not.?found|does not exist)|model_not_found/.test(d) || status === 404) {
    return "🧩 Not found — a retired model name or a wrong endpoint URL.";
  }
  if (/timeout|timed out|aborted/.test(d) || status === 504 || status === 408) {
    return "⏱️ Timed out — the provider is overloaded or hanging.";
  }
  if (/too many (clients|connections)|terminating connection|password authentication failed|connect_timeout|drizzlequeryerror|failed query/.test(d)) {
    return "🗄️ Database error — Neon unreachable, connections exhausted, a bad DATABASE_URL, or a failing query.";
  }
  if (/enotfound|econnrefused|econnreset|fetch failed|network|socket/.test(d)) {
    return "🔌 Unreachable — DNS or connection failure; the provider (or our network path to it) is down.";
  }
  if (status !== undefined && status >= 500) {
    return "🔥 Provider-side error — their service is failing. Check their status page.";
  }
  if (/not.?configured/.test(d)) {
    return "⚙️ Not configured — a required env var is missing on this deployment.";
  }
  return "";
}

function render(a: AlertInput, held: number): string {
  const icon = (a.severity ?? "critical") === "critical" ? "🚨" : "⚠️";
  const where = process.env.VERCEL_ENV ?? env.NODE_ENV;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const when = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });

  const err = a.error instanceof Error ? a.error : undefined;
  const detail = a.detail ?? (a.error !== undefined ? errorMessage(a.error) : undefined);
  const hint = a.hint ?? explainFailure(a.status, detail);

  const lines = [`${icon} *${a.title}*`, `*Source:* \`${a.source}\`${a.status ? `  ·  *HTTP:* ${a.status}` : ""}`];
  if (hint) lines.push(`*Likely cause:* ${hint}`);
  const ctx = Object.entries(a.context ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (ctx.length) lines.push(ctx.map(([k, v]) => `*${k}:* ${v}`).join("  ·  "));
  if (detail) lines.push("*Detail:*\n```" + clip(detail, 1200) + "```");
  const stack = err?.stack?.split("\n").slice(1, 9).join("\n");
  if (stack) lines.push("*Stack:*\n```" + clip(stack, 1500) + "```");
  if (err?.cause) lines.push(`*Cause:* ${clip(errorMessage(err.cause), 400)}`);
  if (held > 0) lines.push(`_+${held} more of these in the last ${COOLDOWN_MS / 60_000} min (held back)_`);
  lines.push(`_${where}${commit ? ` · ${commit}` : ""} · ${when} IST_`);
  return lines.join("\n");
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

function clip(s: string, max: number): string {
  // Backticks would close the code block early.
  const t = s.replaceAll("```", "'''");
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
