import "server-only";

import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * The shared front door for scheduled routes.
 *
 * A cron endpoint is an unauthenticated URL that does privileged work — expiring
 * subscriptions, spending the AI budget. It is reachable by anyone who guesses
 * the path, so the secret is the only thing standing in front of it, and every
 * such route has to check it the same way. Two copies of that check is one copy
 * that can drift.
 */

/** Constant-time compare, so the secret cannot be recovered a byte at a time. */
function secretMatches(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length; compare the lengths separately and always run the comparison.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Is this request carrying the cron secret?
 *
 * `Authorization: Bearer <secret>` is what platform schedulers send (Vercel Cron
 * sends exactly this when CRON_SECRET is set); `x-cron-secret` is here for
 * schedulers that cannot set an auth header.
 *
 * NO SECRET CONFIGURED MEANS CLOSED, NOT OPEN. A deployment that forgot the
 * variable gets a route nobody can run, rather than one everybody can.
 */
export function isAuthorizedCron(request: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const alt = request.headers.get("x-cron-secret") ?? "";

  return secretMatches(bearer, secret) || secretMatches(alt, secret);
}
