import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { expireDueSubscriptions } from "@/lib/subscriptions";

/**
 * The nightly subscription sweep.
 *
 * Ends every paid period that has run out and puts those accounts back on
 * `free`, writing one ledger row per account so support can see why a tier
 * changed. See `expireDueSubscriptions` for what each transition means.
 *
 * THIS IS HOUSEKEEPING, NOT THE BOUNDARY. Entitlement is decided by
 * `effectivePlan()`, which compares the expiry to the clock on every request —
 * an account is locked out the moment its window closes whether or not this
 * route has run since. A missed night therefore costs correctness nothing; it
 * only leaves the columns stale. That is deliberate: a cron that must not be
 * missed is a cron that will be, one deploy or one outage from now.
 *
 * Schedule it once a day (a platform cron, or any scheduler that can send an
 * authenticated GET). Running it more often is harmless — a second run inside
 * the same minute finds nothing left to do.
 */

// Never prerendered, never cached: it mutates.
export const dynamic = "force-dynamic";

/** Constant-time compare, so the secret cannot be recovered a byte at a time. */
function secretMatches(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on a length mismatch, which would itself leak the
  // length; compare the lengths separately and always run the comparison.
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  // No secret configured = the endpoint is closed, not open. An unauthenticated
  // sweep is a way for anyone to churn the billing ledger.
  if (!secret) return false;

  // `Authorization: Bearer <secret>` is what platform cron schedulers send;
  // `x-cron-secret` is here for schedulers that cannot set an auth header.
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const alt = request.headers.get("x-cron-secret") ?? "";

  return secretMatches(bearer, secret) || secretMatches(alt, secret);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    // 404, not 401: an unauthenticated caller learns nothing about whether this
    // route exists or whether a secret is configured.
    return new NextResponse(null, { status: 404 });
  }

  const result = await expireDueSubscriptions();

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

/** Same job, for schedulers that POST. */
export const POST = GET;
