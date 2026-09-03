import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
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

/**
 * Housekeeping that rides along with the nightly sweep: drop spent rate-limit
 * windows.
 *
 * `rate_limits` is written on every guarded action and nothing ever deleted from
 * it, so it grows by a few rows per user per day forever. Expired rows are read
 * by nobody — the limiter resets a window it finds expired rather than trusting
 * what is in it — so removing them reclaims space and costs nothing. A day of
 * slack is kept so a row is never dropped while its window is still counting.
 *
 * NIGHTLY, not with the scoring sweep. There is no index on `expires_at` and no
 * reason to add one for housekeeping: the delete is a scan, which is cheap once
 * a day on a small table and pure waste every five minutes.
 */
async function pruneRateLimits(): Promise<number> {
  const res = await db.execute(
    sql`DELETE FROM rate_limits WHERE expires_at < now() - interval '1 day'`,
  );
  return Number((res as { count?: number }).count ?? 0);
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    // 404, not 401: an unauthenticated caller learns nothing about whether this
    // route exists or whether a secret is configured.
    return new NextResponse(null, { status: 404 });
  }

  const result = await expireDueSubscriptions();
  const prunedRateLimits = await pruneRateLimits();

  return NextResponse.json(
    { ...result, prunedRateLimits },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Same job, for schedulers that POST. */
export const POST = GET;
