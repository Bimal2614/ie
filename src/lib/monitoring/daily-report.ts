import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { env } from "@/lib/env";
import { PLAN_KEYS, PLANS, toPlanKey, type PlanKey } from "@/lib/plans";
import type { subscriptionStatus } from "@/db/schema";

/**
 * The morning business report: what happened yesterday, and where we stand.
 *
 * WHY A REPORT AND NOT A DASHBOARD. There is no admin analytics page, and the
 * numbers that decide whether a day was good — signups, who paid, how many
 * subscriptions are still live — are spread across three tables nobody is going
 * to open psql for at 7am. This assembles them once a day and mails them. Same
 * bargain as the AI smoke test next door: nothing is stored, the mail is the
 * record, and two mornings' mails are directly comparable because the run is
 * always the same run.
 *
 * READ-ONLY, ALWAYS. Every query here is a SELECT. A reporting job that writes
 * is a reporting job that can corrupt the thing it reports on, and this one runs
 * unattended against production — so if a number here is ever wrong, the fix is
 * in this file and the ledger is untouched.
 *
 * THE DAY IS AN IST DAY. See `istDay`. Everything the business thinks of as
 * "yesterday" is an Indian calendar day, and a report boundary that drifts from
 * that produces numbers that are unarguable-with and useless.
 */

/* ------------------------------------------------------------------ *
 * The reporting window
 * ------------------------------------------------------------------ */

/**
 * India Standard Time, as a fixed offset. UTC+5:30, and it has no daylight
 * saving — which is the only reason a plain offset is honest here rather than a
 * timezone-database lookup.
 */
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const DAY_MS = 86_400_000;

/** One IST calendar day, and the UTC instants that bound it: [from, to). */
export type IstDay = {
  /** "2026-09-04" — the IST date this report is about. */
  date: string;
  /** Inclusive start, as a UTC instant. */
  from: Date;
  /** Exclusive end, as a UTC instant. */
  to: Date;
};

/** Midnight IST at the start of the IST day containing `instant`, in UTC. */
function istMidnight(instant: Date): Date {
  // Shift into IST, truncate the clock, shift back. Reading the UTC fields of
  // the shifted value is reading IST wall-clock time, which is the trick that
  // keeps this free of the server's own timezone — a Vercel function runs in
  // UTC and a laptop does not, and this must not tell them apart.
  const shifted = new Date(instant.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

/** "2026-09-04" for the IST day starting at `from`. */
function istDateLabel(from: Date): string {
  return new Date(from.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * The IST day to report on: yesterday, by default.
 *
 * YESTERDAY AND NOT TODAY, because a complete day is the only one worth
 * comparing to another. The cron fires in the early hours IST, at which point
 * today is a few hours old and would make every morning's report read as a
 * collapse.
 *
 * `date` ("YYYY-MM-DD", read as an IST date) reports on that day instead, which
 * is how a morning that got lost is re-sent and how a number is checked by hand.
 */
export function istDay(opts: { date?: string | null; now?: Date } = {}): IstDay {
  const now = opts.now ?? new Date();

  if (opts.date && /^\d{4}-\d{2}-\d{2}$/.test(opts.date)) {
    // Midnight UTC on that date, pulled back 5:30 — midnight IST on that date.
    const from = new Date(Date.parse(`${opts.date}T00:00:00.000Z`) - IST_OFFSET_MS);
    if (!Number.isNaN(from.getTime())) {
      return { date: opts.date, from, to: new Date(from.getTime() + DAY_MS) };
    }
  }

  const to = istMidnight(now);
  const from = new Date(to.getTime() - DAY_MS);
  return { date: istDateLabel(from), from, to };
}

/* ------------------------------------------------------------------ *
 * Shapes
 * ------------------------------------------------------------------ */

export type SubscriptionStatus = (typeof subscriptionStatus.enumValues)[number];

/**
 * What a money event was. The ledger records a dozen event types; these are the
 * ones meaning somebody now holds a plan they did not hold a moment ago.
 */
export type PurchaseKind = "new" | "upgrade" | "downgrade" | "renewal" | "reactivation" | "payment";

export type Purchase = {
  at: Date;
  name: string;
  email: string;
  /** The tier they hold after the event. */
  plan: PlanKey;
  /** The tier they held before it, when the ledger recorded one. */
  fromPlan: PlanKey | null;
  kind: PurchaseKind;
  amountCents: number | null;
  currency: string;
  provider: "manual" | "razorpay" | null;
  /**
   * An admin put this here — a support credit, a comp, a bank transfer
   * reconciled by hand. Listed with the rest, because it is still a plan
   * somebody now has, but kept OUT of the revenue line: counting a comp as
   * income is how a dashboard starts lying to you.
   */
  comped: boolean;
};

export type Signup = {
  at: Date;
  name: string;
  email: string;
  verified: boolean;
  via: "google" | "email";
};

export type Money = { currency: string; cents: number };

export type PlanCount = { plan: PlanKey; users: number };

export type StatusCount = { status: SubscriptionStatus; plan: PlanKey; count: number };

export type DailyReport = {
  generatedAt: string;
  tookMs: number;
  /** Which deployment produced this, so a staging report is never read as production. */
  origin: string;
  day: IstDay;

  signups: {
    total: number;
    verified: number;
    viaGoogle: number;
    /** The first `SIGNUP_LIST_CAP` of them; `total` is the real number. */
    list: Signup[];
  };

  purchases: {
    /** Every money event in the window, oldest first. */
    list: Purchase[];
    /** Paid events only, by currency — comps excluded. */
    revenue: Money[];
    newCount: number;
    renewalCount: number;
    changeCount: number;
    compedCount: number;
  };

  /** Everything else the ledger recorded in the window, by event name. */
  otherEvents: { event: string; count: number }[];

  totals: {
    users: number;
    verifiedUsers: number;
    deactivatedUsers: number;
    signups7d: number;
    signups30d: number;
  };

  /** Users by the tier they can actually use right now, not by the raw column. */
  usersByPlan: PlanCount[];
  /** Every subscription row, by status and tier. */
  subscriptionsByStatus: StatusCount[];
  /** Live subscriptions (active + cancelling + past_due), by tier. */
  liveByPlan: { plan: PlanKey; count: number }[];
  liveTotal: number;
  /**
   * What the live book bills per month, by currency.
   *
   * NORMALISED TO A MONTH, which is the only way Pro and Premium can be added
   * together: Premium sells three months at a time, so its sticker price is
   * three months of revenue and counting it whole would inflate the run rate
   * threefold on every Premium customer.
   */
  monthlyRunRate: Money[];
};

/**
 * How many of the day's new accounts to name in the mail before summarising.
 *
 * A cap and not the lot: a good day is meant to be readable on a phone, and a
 * launch that brings four hundred signups should not produce a four-hundred-row
 * mail. `signups.total` still carries the real number, and the mail says how
 * many it did not list.
 */
const SIGNUP_LIST_CAP = 25;

/* ------------------------------------------------------------------ *
 * Row helpers
 * ------------------------------------------------------------------ */

const PURCHASE_KINDS: Record<string, PurchaseKind> = {
  plan_granted: "new",
  upgraded: "upgrade",
  downgraded: "downgrade",
  renewed: "renewal",
  reactivated: "reactivation",
  payment_succeeded: "payment",
};

/** Sum minor units by currency, dropping currencies that came to nothing. */
function totalByCurrency(rows: Money[]): Money[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.cents);
  }
  return [...totals]
    .filter(([, cents]) => cents !== 0)
    .map(([currency, cents]) => ({ currency, cents }))
    .sort((a, b) => b.cents - a.cents);
}

/* ------------------------------------------------------------------ *
 * The run
 * ------------------------------------------------------------------ */

/**
 * Gather one morning's numbers.
 *
 * Every query is issued at once — they are independent reads and the whole
 * point is to be finished before anyone is awake. Raw SQL rather than the query
 * builder for the aggregates: these are GROUP BY / FILTER shapes Postgres does
 * in a single pass and that the builder would only obscure.
 */
export async function buildDailyReport(day: IstDay): Promise<DailyReport> {
  const startedAt = Date.now();
  const { from, to } = day;

  /*
   * Bounds go to Postgres as ISO STRINGS WITH AN EXPLICIT CAST, never as Date
   * objects. drizzle's raw `sql` passes parameters through to postgres-js
   * untouched, and that driver serializes only strings and buffers — a Date
   * reaches it and the query dies with `ERR_INVALID_ARG_TYPE` at bind time,
   * which is a runtime failure no type checker sees. `toISOString()` is always
   * UTC with a `Z`, so the cast is unambiguous whatever the server's timezone.
   *
   * Trailing windows are measured back from the END of the reported day rather
   * than from now: re-running a week-old report has to reproduce that week's
   * numbers, not today's.
   */
  const fromTs = from.toISOString();
  const toTs = to.toISOString();
  const weekAgoTs = new Date(to.getTime() - 7 * DAY_MS).toISOString();
  const monthAgoTs = new Date(to.getTime() - 30 * DAY_MS).toISOString();

  const [userRows, signupRows, planRows, statusRows, liveRows, purchaseRows, eventRows] =
    (await Promise.all([
      db.execute(sql`
        SELECT
          count(*)::int                                            AS total,
          count(*) FILTER (WHERE email_verified)::int              AS verified,
          count(*) FILTER (WHERE deactivated_at IS NOT NULL)::int  AS deactivated,
          count(*) FILTER (
            WHERE created_at >= ${fromTs}::timestamptz
              AND created_at <  ${toTs}::timestamptz
          )::int                                                   AS day_total,
          count(*) FILTER (
            WHERE created_at >= ${fromTs}::timestamptz
              AND created_at <  ${toTs}::timestamptz
              AND email_verified
          )::int                                                   AS day_verified,
          count(*) FILTER (
            WHERE created_at >= ${fromTs}::timestamptz
              AND created_at <  ${toTs}::timestamptz
              AND google_id IS NOT NULL
          )::int                                                   AS day_google,
          count(*) FILTER (
            WHERE created_at >= ${weekAgoTs}::timestamptz
              AND created_at <  ${toTs}::timestamptz
          )::int                                                   AS signups_7d,
          count(*) FILTER (
            WHERE created_at >= ${monthAgoTs}::timestamptz
              AND created_at <  ${toTs}::timestamptz
          )::int                                                   AS signups_30d
        FROM users
      `),

      db.execute(sql`
        SELECT created_at, name, email, email_verified, google_id
        FROM users
        WHERE created_at >= ${fromTs}::timestamptz AND created_at < ${toTs}::timestamptz
        ORDER BY created_at
        LIMIT ${SIGNUP_LIST_CAP}
      `),

      /*
       * Users by the plan they can USE, which is not what `users.plan` says: an
       * expired window leaves the tier in place on purpose (see the schema) so
       * that a renewal restores it, which means the raw column counts every
       * lapsed customer as a paying one. This applies the same rule
       * `effectivePlan()` applies on every request.
       */
      db.execute(sql`
        SELECT
          CASE
            WHEN plan = 'free' THEN 'free'
            WHEN plan_expires_at IS NOT NULL AND plan_expires_at <= now() THEN 'free'
            ELSE plan::text
          END           AS plan,
          count(*)::int AS users
        FROM users
        GROUP BY 1
      `),

      db.execute(sql`
        SELECT status::text AS status, plan::text AS plan, count(*)::int AS n
        FROM subscriptions
        GROUP BY 1, 2
      `),

      db.execute(sql`
        SELECT
          plan::text                          AS plan,
          currency,
          count(*)::int                       AS n,
          coalesce(sum(price_cents), 0)::text AS cents
        FROM subscriptions
        WHERE status IN ('active', 'cancelling', 'past_due')
        GROUP BY 1, 2
      `),

      /*
       * The day's money events, from the billing ledger rather than from
       * `subscriptions` — the ledger is the only place a RENEWAL appears as an
       * event, because a renewal rolls the existing row forward instead of
       * inserting one. Counting new subscription rows would report every
       * renewing customer as having quietly vanished.
       */
      db.execute(sql`
        SELECT
          l.created_at,
          l.event::text     AS event,
          l.actor::text     AS actor,
          l.from_plan::text AS from_plan,
          l.to_plan::text   AS to_plan,
          l.amount_cents,
          l.currency,
          u.name,
          u.email,
          s.provider::text  AS provider
        FROM subscription_logs l
        JOIN users u ON u.id = l.user_id
        LEFT JOIN subscriptions s ON s.id = l.subscription_id
        WHERE l.created_at >= ${fromTs}::timestamptz
          AND l.created_at <  ${toTs}::timestamptz
          AND l.event IN ('plan_granted', 'upgraded', 'downgraded',
                          'renewed', 'reactivated', 'payment_succeeded')
        ORDER BY l.created_at
      `),

      db.execute(sql`
        SELECT event::text AS event, count(*)::int AS n
        FROM subscription_logs
        WHERE created_at >= ${fromTs}::timestamptz
          AND created_at <  ${toTs}::timestamptz
          AND event NOT IN ('plan_granted', 'upgraded', 'downgraded',
                            'renewed', 'reactivated', 'payment_succeeded')
        GROUP BY 1
        ORDER BY 2 DESC
      `),
    ])) as unknown as [
      Array<{
        total: number;
        verified: number;
        deactivated: number;
        day_total: number;
        day_verified: number;
        day_google: number;
        signups_7d: number;
        signups_30d: number;
      }>,
      Array<{
        created_at: Date;
        name: string;
        email: string;
        email_verified: boolean;
        google_id: string | null;
      }>,
      Array<{ plan: string; users: number }>,
      Array<{ status: string; plan: string; n: number }>,
      Array<{ plan: string; currency: string; n: number; cents: string }>,
      Array<{
        created_at: Date;
        event: string;
        actor: string;
        from_plan: string | null;
        to_plan: string | null;
        amount_cents: number | null;
        currency: string | null;
        name: string;
        email: string;
        provider: string | null;
      }>,
      Array<{ event: string; n: number }>,
    ];

  const u = userRows[0];

  const signups: Signup[] = signupRows.map((r) => ({
    at: new Date(r.created_at),
    name: r.name,
    email: r.email,
    verified: r.email_verified,
    via: r.google_id ? "google" : "email",
  }));

  const purchases: Purchase[] = purchaseRows.map((r) => ({
    at: new Date(r.created_at),
    name: r.name,
    email: r.email,
    plan: toPlanKey(r.to_plan),
    fromPlan: r.from_plan ? toPlanKey(r.from_plan) : null,
    kind: PURCHASE_KINDS[r.event] ?? "payment",
    amountCents: r.amount_cents === null ? null : Number(r.amount_cents),
    currency: r.currency ?? "INR",
    provider: r.provider === "razorpay" || r.provider === "manual" ? r.provider : null,
    comped: r.actor === "admin",
  }));

  const revenue = totalByCurrency(
    purchases
      .filter((p) => !p.comped && p.amountCents)
      .map((p) => ({ currency: p.currency, cents: p.amountCents ?? 0 })),
  );

  // Plan counts come back only for tiers that have somebody on them; the mail
  // wants every tier in tier order, so a zero is visible rather than absent.
  const planTally = new Map(planRows.map((r) => [toPlanKey(r.plan), Number(r.users)]));
  const usersByPlan: PlanCount[] = PLAN_KEYS.map((plan) => ({
    plan,
    users: planTally.get(plan) ?? 0,
  }));

  const subscriptionsByStatus: StatusCount[] = statusRows
    .map((r) => ({
      status: r.status as SubscriptionStatus,
      plan: toPlanKey(r.plan),
      count: Number(r.n),
    }))
    .sort((a, b) => b.count - a.count);

  const liveTally = new Map<PlanKey, number>();
  const runRateRows: Money[] = [];
  for (const row of liveRows) {
    const plan = toPlanKey(row.plan);
    liveTally.set(plan, (liveTally.get(plan) ?? 0) + Number(row.n));
    const months = PLANS[plan].billingMonths;
    // `free` bills zero months and must never divide. A live subscription on
    // `free` is not something the writers can produce, but a report is the
    // wrong place to find out otherwise.
    if (months > 0) {
      runRateRows.push({ currency: row.currency, cents: Math.round(Number(row.cents) / months) });
    }
  }
  const liveByPlan = PLAN_KEYS.filter((plan) => (liveTally.get(plan) ?? 0) > 0).map((plan) => ({
    plan,
    count: liveTally.get(plan) ?? 0,
  }));

  return {
    generatedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    origin: env.APP_URL ?? "unknown deployment",
    day,
    signups: {
      total: Number(u.day_total),
      verified: Number(u.day_verified),
      viaGoogle: Number(u.day_google),
      list: signups,
    },
    purchases: {
      list: purchases,
      revenue,
      newCount: purchases.filter((p) => p.kind === "new" && !p.comped).length,
      renewalCount: purchases.filter((p) => p.kind === "renewal" || p.kind === "reactivation")
        .length,
      changeCount: purchases.filter((p) => p.kind === "upgrade" || p.kind === "downgrade").length,
      compedCount: purchases.filter((p) => p.comped).length,
    },
    otherEvents: eventRows.map((r) => ({ event: r.event, count: Number(r.n) })),
    totals: {
      users: Number(u.total),
      verifiedUsers: Number(u.verified),
      deactivatedUsers: Number(u.deactivated),
      signups7d: Number(u.signups_7d),
      signups30d: Number(u.signups_30d),
    },
    usersByPlan,
    subscriptionsByStatus,
    liveByPlan,
    liveTotal: [...liveTally.values()].reduce((a, b) => a + b, 0),
    monthlyRunRate: totalByCurrency(runRateRows),
  };
}
