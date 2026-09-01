import "server-only";

import { and, desc, eq, inArray, isNotNull, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionLogs, subscriptions, users } from "@/db/schema";
import type { Subscription } from "@/db/schema";
import { effectivePlan, planRank, PLANS, toPlanKey, type PlanKey } from "@/lib/plans";

/**
 * The ONLY writer for what a candidate is entitled to.
 *
 * Two places record a plan and they must never disagree: `subscriptions` is the
 * record of truth (what was bought, for how long, by what means) and
 * `users.plan` / `users.plan_expires_at` is the cached copy every gate reads on
 * the hot path. Splitting the write across a checkout route, an admin action
 * and a webhook is exactly how those two drift — so every transition goes
 * through a function here, each one updating both tables and appending to
 * `subscription_logs` inside a single transaction.
 *
 * Nothing in this file trusts a caller for the tier a user ends up on: the
 * user row is always written from the subscription that was just created or
 * ended, never from a parameter the caller could get wrong.
 */

type Actor = "user" | "admin" | "system" | "webhook";
type PaymentProvider = "manual" | "razorpay";
type Status = "active" | "cancelling" | "expired" | "cancelled" | "past_due";

/** Statuses that still entitle the user. Anything else has stopped granting. */
const LIVE_STATUSES = ["active", "cancelling", "past_due"] as const;

/**
 * When a period that starts at `from` runs out.
 *
 * `months` IS REQUIRED, and that is the point. It used to default to 1, which
 * held only while every tier was monthly — the moment Premium became a 3-month
 * plan, that default would have sold a quarter and granted a month. The term
 * now comes from `PLANS[plan].billingMonths` at each call, so changing a tier's
 * length is a one-line edit in src/lib/plans.ts and nothing here has to
 * remember to change with it. Pass an explicit figure only for the arrangements
 * a human drives - a support credit, a deal agreed off-platform.
 *
 * Calendar arithmetic, not "+30 days": a candidate who buys on the 30th of
 * November should run to the last day of February, and JS's Date already rolls
 * an overflowing day into the next month.
 */
export function periodEndFor(from: Date, months: number): Date {
  const end = new Date(from.getTime());
  end.setUTCMonth(end.getUTCMonth() + months);
  return end;
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

/** The subscription currently granting entitlement, if any. Newest first. */
export async function currentSubscription(userId: string): Promise<Subscription | null> {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), inArray(subscriptions.status, [...LIVE_STATUSES])))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return row ?? null;
}

/**
 * The row a gateway's handle (`sub_…`) refers to, whatever state it is in.
 *
 * DELIBERATELY NOT FILTERED TO LIVE STATUSES. A webhook is the one caller that
 * knows a subscription by this id, and the events it brings are often about a
 * row that has stopped granting — a charge that lands after the sweep expired
 * the window, a cancellation confirmed days later. Returning null for those
 * would send the webhook down its "no local row, create one" path and open a
 * second subscription for a mandate that already has one, which is exactly what
 * the unique index on this column exists to make impossible.
 */
export async function subscriptionByProviderId(
  providerSubscriptionId: string,
): Promise<Subscription | null> {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerSubscriptionId, providerSubscriptionId))
    .limit(1);
  return row ?? null;
}

/** Every subscription a user has ever had, newest first. For support/settings. */
export async function subscriptionHistory(userId: string): Promise<Subscription[]> {
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt));
}

/** The billing ledger for one user, newest first. */
export async function billingLog(userId: string, limit = 100) {
  return db
    .select()
    .from(subscriptionLogs)
    .where(eq(subscriptionLogs.userId, userId))
    .orderBy(desc(subscriptionLogs.createdAt))
    .limit(limit);
}

/* ------------------------------------------------------------------ *
 * The ledger
 * ------------------------------------------------------------------ */

type LogInput = {
  userId: string;
  subscriptionId?: string | null;
  event:
    | "created"
    | "activated"
    | "renewed"
    | "upgraded"
    | "downgraded"
    | "cancel_requested"
    | "cancelled"
    | "expired"
    | "reactivated"
    | "payment_succeeded"
    | "payment_failed"
    | "refunded"
    | "plan_granted"
    | "plan_revoked";
  actor?: Actor;
  actorUserId?: string | null;
  fromPlan?: PlanKey | null;
  toPlan?: PlanKey | null;
  status?: Status | null;
  effectiveAt?: Date | null;
  expiresAt?: Date | null;
  amountCents?: number | null;
  currency?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Append one event to the billing ledger.
 *
 * Exported because a payment webhook has events of its own to record —
 * `payment_failed`, `refunded` — that change no entitlement and so belong to no
 * transition function here. Takes an optional `tx` so a transition writes its
 * row inside the same transaction that moved the tables.
 */
export async function logBillingEvent(
  input: LogInput,
  tx: Pick<typeof db, "insert"> = db,
): Promise<void> {
  await tx.insert(subscriptionLogs).values({
    userId: input.userId,
    subscriptionId: input.subscriptionId ?? null,
    event: input.event,
    actor: input.actor ?? "system",
    actorUserId: input.actorUserId ?? null,
    fromPlan: input.fromPlan ?? null,
    toPlan: input.toPlan ?? null,
    status: input.status ?? null,
    effectiveAt: input.effectiveAt ?? null,
    expiresAt: input.expiresAt ?? null,
    amountCents: input.amountCents ?? null,
    currency: input.currency ?? null,
    note: input.note ?? null,
    metadata: input.metadata ?? null,
  });
}

/* ------------------------------------------------------------------ *
 * Transitions
 * ------------------------------------------------------------------ */

export type GrantInput = {
  userId: string;
  plan: Exclude<PlanKey, "free">;
  /** Defaults to now. A payment callback passes the moment it was paid. */
  startsAt?: Date;
  /**
   * Defaults to the plan's own term (`billingMonths`) from `startsAt`. Pass an
   * explicit date for a longer arrangement, or `null` for an account that never
   * lapses.
   */
  periodEnd?: Date | null;
  /** What was charged, in minor units. Omit for a free grant. */
  priceCents?: number | null;
  currency?: string;
  actor?: Actor;
  actorUserId?: string | null;
  note?: string | null;
  /** Payment reference, gateway payload, ticket number - anything worth keeping. */
  metadata?: Record<string, unknown> | null;
  /**
   * Who is billing this, when it is not a human.
   *
   * Defaults to `manual`, which is what an admin grant and a reconciled bank
   * transfer are. A gateway passes its own name and the handle it knows the
   * subscription by, and that handle is the ONLY thing a later webhook has to
   * find this row with — omit it and the renewal three months from now has
   * nowhere to land.
   */
  provider?: PaymentProvider;
  providerSubscriptionId?: string | null;
  providerPlanId?: string | null;
};

/**
 * Put a user on a paid plan: the entry point for checkout, for an admin grant,
 * and for a provider's "subscription created" webhook.
 *
 * Any subscription already running is CLOSED first rather than left open beside
 * the new one. Two live rows would make "what are they on?" ambiguous at the
 * exact moment the answer has to be unambiguous — a candidate moving from Pro
 * to Premium mid-month is one entitlement replacing another, and the ledger
 * records it as `upgraded`/`downgraded` so nothing about the change is lost.
 */
export async function grantPlan(input: GrantInput): Promise<Subscription> {
  const now = new Date();
  const startsAt = input.startsAt ?? now;
  // The term is the PLAN's, not a fixed month: Premium sells three at a time.
  const periodEnd =
    input.periodEnd !== undefined
      ? input.periodEnd
      : periodEndFor(startsAt, PLANS[input.plan].billingMonths);

  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
      .from(users)
      .where(eq(users.id, input.userId))
      .limit(1);
    if (!user) throw new Error("grantPlan: no such user");

    const fromPlan = effectivePlan(toPlanKey(user.plan), user.planExpiresAt, now);

    // Close anything still running. `endsAt` is now, not the period end: this
    // subscription is being replaced, and leaving its window open would have
    // the sweep expire it later and downgrade an account that has since paid.
    const [previous] = await tx
      .update(subscriptions)
      .set({ status: "cancelled", endsAt: now, cancelledAt: now, updatedAt: now })
      .where(
        and(
          eq(subscriptions.userId, input.userId),
          inArray(subscriptions.status, [...LIVE_STATUSES]),
        ),
      )
      .returning({ id: subscriptions.id });

    const [created] = await tx
      .insert(subscriptions)
      .values({
        userId: input.userId,
        plan: input.plan,
        status: "active",
        startsAt,
        currentPeriodStart: startsAt,
        currentPeriodEnd: periodEnd,
        priceCents: input.priceCents ?? null,
        currency: input.currency ?? "USD",
        provider: input.provider ?? "manual",
        providerSubscriptionId: input.providerSubscriptionId ?? null,
        providerPlanId: input.providerPlanId ?? null,
      })
      .returning();

    await tx
      .update(users)
      .set({ plan: input.plan, planExpiresAt: periodEnd, updatedAt: now })
      .where(eq(users.id, input.userId));

    const event =
      fromPlan === "free"
        ? "plan_granted"
        : fromPlan === input.plan
          ? "renewed"
          : planRank(input.plan) > planRank(fromPlan)
            ? "upgraded"
            : "downgraded";

    await logBillingEvent(
      {
        userId: input.userId,
        subscriptionId: created.id,
        event,
        actor: input.actor ?? "system",
        actorUserId: input.actorUserId ?? null,
        fromPlan,
        toPlan: input.plan,
        status: "active",
        effectiveAt: startsAt,
        expiresAt: periodEnd,
        amountCents: input.priceCents ?? null,
        currency: input.currency ?? "USD",
        note: input.note ?? (previous ? "Replaced an existing subscription" : null),
        metadata: input.metadata ?? null,
      },
      tx,
    );

    return created;
  });
}

/**
 * Roll a subscription's window forward — the "payment succeeded" path.
 *
 * Renews the row in place rather than opening a new one, so `starts_at` keeps
 * saying when the customer relationship began while the paid window moves.
 */
export async function renewSubscription(
  subscriptionId: string,
  opts: {
    periodEnd?: Date | null;
    /**
     * Where the new window BEGINS, when the payer knows better than we do.
     *
     * Razorpay reports `current_start`/`current_end` for the cycle it has just
     * charged, and those are the authoritative dates — they are what the
     * customer's bank statement will agree with. Passing both makes this
     * function idempotent, which is what a webhook needs: a redelivered
     * `subscription.charged` writes the same window it wrote the first time,
     * instead of adding another term to the end of the last one.
     *
     * Omit it and the window is computed the old way, from where the previous
     * one ended — still right for a renewal nobody has dated for us.
     */
    periodStart?: Date;
    amountCents?: number | null;
    actor?: Actor;
    note?: string | null;
    metadata?: Record<string, unknown> | null;
  } = {},
): Promise<void> {
  const now = new Date();

  await db.transaction(async (tx) => {
    const [sub] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);
    if (!sub) throw new Error("renewSubscription: no such subscription");

    // Renew from where the paid window ACTUALLY ended, not from now: a webhook
    // that lands a few hours late must not shorten what was paid for. A window
    // that closed in the past renews from today instead, so a lapsed account
    // that comes back gets a whole period rather than a backdated one.
    const base =
      opts.periodStart ??
      (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > now.getTime()
        ? sub.currentPeriodEnd
        : now);
    // Renews for another of whatever the plan sells, so a quarterly tier rolls
    // forward a quarter rather than quietly becoming monthly on renewal.
    const periodEnd =
      opts.periodEnd !== undefined
        ? opts.periodEnd
        : periodEndFor(base, PLANS[toPlanKey(sub.plan)].billingMonths);

    await tx
      .update(subscriptions)
      .set({
        status: "active",
        currentPeriodStart: base,
        currentPeriodEnd: periodEnd,
        // A renewal supersedes a pending cancellation only if one was never
        // requested; a cancelling subscription that renews is a reactivation.
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        endsAt: null,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, subscriptionId));

    await tx
      .update(users)
      .set({ plan: sub.plan, planExpiresAt: periodEnd, updatedAt: now })
      .where(eq(users.id, sub.userId));

    await logBillingEvent(
      {
        userId: sub.userId,
        subscriptionId: sub.id,
        event: sub.status === "cancelling" ? "reactivated" : "renewed",
        actor: opts.actor ?? "webhook",
        fromPlan: toPlanKey(sub.plan),
        toPlan: toPlanKey(sub.plan),
        status: "active",
        effectiveAt: base,
        expiresAt: periodEnd,
        amountCents: opts.amountCents ?? sub.priceCents,
        currency: sub.currency,
        note: opts.note ?? null,
        metadata: opts.metadata ?? null,
      },
      tx,
    );
  });
}

/**
 * Cancel at the end of the paid period — what a candidate clicking "cancel"
 * gets.
 *
 * NOTHING IS TAKEN AWAY HERE. They paid to the end of the term, so they keep
 * the tier until `current_period_end` and the sweep is what withdraws it. This
 * only records the intent, which is also what stops the renewal.
 */
export async function requestCancellation(
  userId: string,
  opts: { reason?: string | null; actor?: Actor; actorUserId?: string | null } = {},
): Promise<{ cancelled: boolean; entitledUntil: Date | null }> {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [sub] = await tx
      .select()
      .from(subscriptions)
      .where(
        and(eq(subscriptions.userId, userId), inArray(subscriptions.status, [...LIVE_STATUSES])),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    if (!sub) return { cancelled: false, entitledUntil: null };

    await tx
      .update(subscriptions)
      .set({
        status: "cancelling",
        cancelAtPeriodEnd: true,
        cancelledAt: now,
        cancelReason: opts.reason ?? null,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, sub.id));

    await logBillingEvent(
      {
        userId,
        subscriptionId: sub.id,
        event: "cancel_requested",
        actor: opts.actor ?? "user",
        actorUserId: opts.actorUserId ?? null,
        fromPlan: toPlanKey(sub.plan),
        toPlan: toPlanKey(sub.plan),
        status: "cancelling",
        expiresAt: sub.currentPeriodEnd,
        note: opts.reason ?? null,
      },
      tx,
    );

    return { cancelled: true, entitledUntil: sub.currentPeriodEnd };
  });
}

/**
 * End a subscription immediately and drop the account to free — a refund, an
 * admin revoke, or a chargeback. Distinct from `requestCancellation`, which
 * honours the paid period.
 */
export async function revokePlan(
  userId: string,
  opts: {
    reason?: string | null;
    actor?: Actor;
    actorUserId?: string | null;
    event?: "cancelled" | "refunded" | "plan_revoked";
  } = {},
): Promise<{ revoked: boolean }> {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [sub] = await tx
      .update(subscriptions)
      .set({
        status: "cancelled",
        endsAt: now,
        cancelledAt: now,
        cancelReason: opts.reason ?? null,
        updatedAt: now,
      })
      .where(
        and(eq(subscriptions.userId, userId), inArray(subscriptions.status, [...LIVE_STATUSES])),
      )
      .returning();

    const [user] = await tx
      .update(users)
      .set({ plan: "free", planExpiresAt: null, updatedAt: now })
      .where(eq(users.id, userId))
      .returning({ plan: users.plan });

    // A user with no live subscription is already free; recording the event
    // anyway would put a revocation in the ledger that revoked nothing.
    if (!sub && !user) return { revoked: false };

    await logBillingEvent(
      {
        userId,
        subscriptionId: sub?.id ?? null,
        event: opts.event ?? "plan_revoked",
        actor: opts.actor ?? "admin",
        actorUserId: opts.actorUserId ?? null,
        fromPlan: sub ? toPlanKey(sub.plan) : null,
        toPlan: "free",
        status: "cancelled",
        effectiveAt: now,
        note: opts.reason ?? null,
      },
      tx,
    );

    return { revoked: Boolean(sub) };
  });
}

/**
 * Mark a subscription past due after a failed renewal, keeping entitlement for
 * a grace window so a card that fails on the 1st does not lock a candidate out
 * mid-practice. When the grace runs out the sweep expires it like any other.
 */
export async function markPastDue(
  subscriptionId: string,
  opts: { graceDays?: number; note?: string | null } = {},
): Promise<void> {
  const now = new Date();
  const graceDays = opts.graceDays ?? 3;

  await db.transaction(async (tx) => {
    const [sub] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);
    if (!sub) throw new Error("markPastDue: no such subscription");

    const graceEnd = new Date(
      Math.max(sub.currentPeriodEnd?.getTime() ?? now.getTime(), now.getTime()) +
        graceDays * 86_400_000,
    );

    await tx
      .update(subscriptions)
      .set({ status: "past_due", currentPeriodEnd: graceEnd, updatedAt: now })
      .where(eq(subscriptions.id, sub.id));

    await tx
      .update(users)
      .set({ planExpiresAt: graceEnd, updatedAt: now })
      .where(eq(users.id, sub.userId));

    await logBillingEvent(
      {
        userId: sub.userId,
        subscriptionId: sub.id,
        event: "payment_failed",
        actor: "webhook",
        fromPlan: toPlanKey(sub.plan),
        toPlan: toPlanKey(sub.plan),
        status: "past_due",
        expiresAt: graceEnd,
        note: opts.note ?? `Payment failed; ${graceDays}-day grace`,
      },
      tx,
    );
  });
}

/* ------------------------------------------------------------------ *
 * The sweep (cron)
 * ------------------------------------------------------------------ */

export type SweepResult = {
  /** Subscriptions whose paid window closed and were ended. */
  expired: number;
  /** Accounts written back to `free`. */
  downgraded: number;
  /** Accounts whose cached tier disagreed with their subscriptions. */
  repaired: number;
  ranAt: string;
};

/**
 * Expire everything whose paid period has run out, and put those accounts back
 * on free.
 *
 * SAFE TO RUN AT ANY CADENCE, AND SAFE TO MISS. It is a tidy-up, not the
 * boundary: `effectivePlan()` already refuses a tier whose expiry has passed,
 * so an account is locked out the moment its window closes whether or not this
 * has run. What the sweep buys is a database that tells the truth — reports,
 * support screens and the next renewal all read the columns, not the clock.
 *
 * Idempotent: a second run in the same minute finds nothing left to do.
 */
export async function expireDueSubscriptions(now: Date = new Date()): Promise<SweepResult> {
  // Ended windows first. `cancelling` becomes `cancelled` (the candidate asked
  // for it) and everything else `expired` (it simply ran out) — support needs
  // to tell "they left" from "the card stopped working" months later.
  const due = await db
    .update(subscriptions)
    .set({
      status: sql`case when ${subscriptions.status} = 'cancelling' then 'cancelled'::subscription_status else 'expired'::subscription_status end`,
      endsAt: now,
      updatedAt: now,
    })
    .where(
      and(
        inArray(subscriptions.status, [...LIVE_STATUSES]),
        isNotNull(subscriptions.currentPeriodEnd),
        lte(subscriptions.currentPeriodEnd, now),
      ),
    )
    .returning({
      id: subscriptions.id,
      userId: subscriptions.userId,
      plan: subscriptions.plan,
      status: subscriptions.status,
      periodEnd: subscriptions.currentPeriodEnd,
    });

  let downgraded = 0;
  for (const row of due) {
    // Only drop the account if this was its last live subscription — an upgrade
    // that landed between the two statements must not be undone by the sweep.
    const [stillLive] = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, row.userId),
          inArray(subscriptions.status, [...LIVE_STATUSES]),
        ),
      )
      .limit(1);
    if (stillLive) continue;

    await db
      .update(users)
      .set({ plan: "free", planExpiresAt: null, updatedAt: now })
      .where(eq(users.id, row.userId));
    downgraded += 1;

    await logBillingEvent({
      userId: row.userId,
      subscriptionId: row.id,
      event: row.status === "cancelled" ? "cancelled" : "expired",
      actor: "system",
      fromPlan: toPlanKey(row.plan),
      toPlan: "free",
      status: row.status,
      effectiveAt: now,
      expiresAt: row.periodEnd,
      note: "Subscription period ended (automatic sweep)",
    });
  }

  /*
   * Second pass: accounts whose cached tier lapsed with no subscription row
   * behind it at all.
   *
   * These exist because `users.plan` can also be set by hand — an admin grant
   * straight in the database, a seed, a migration. Without this they would sit
   * on a paid tier column forever (harmless, since the gates read the expiry,
   * but every support screen would lie). Rows that expired above are already
   * free, so they are not counted twice.
   */
  const repaired = await db
    .update(users)
    .set({ plan: "free", planExpiresAt: null, updatedAt: now })
    .where(
      and(
        ne(users.plan, "free"),
        isNotNull(users.planExpiresAt),
        lte(users.planExpiresAt, now),
      ),
    )
    .returning({ id: users.id });

  for (const u of repaired) {
    await logBillingEvent({
      userId: u.id,
      event: "expired",
      actor: "system",
      toPlan: "free",
      effectiveAt: now,
      note: "Cached plan had lapsed with no live subscription (automatic sweep)",
    });
  }

  return {
    expired: due.length,
    downgraded,
    repaired: repaired.length,
    ranAt: now.toISOString(),
  };
}

/** Subscriptions ending within `days`, for renewal reminders. */
export async function endingSoon(days = 3, now: Date = new Date()) {
  const until = new Date(now.getTime() + days * 86_400_000);
  return db
    .select()
    .from(subscriptions)
    .where(
      and(
        inArray(subscriptions.status, [...LIVE_STATUSES]),
        isNotNull(subscriptions.currentPeriodEnd),
        lte(subscriptions.currentPeriodEnd, until),
      ),
    );
}
