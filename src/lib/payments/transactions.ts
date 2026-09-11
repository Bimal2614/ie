import "server-only";

import type { paymentProvider } from "@/db/schema";

/** Every provider the ledger can record. */
type PaymentProvider = (typeof paymentProvider.enumValues)[number];

import { and, asc, desc, eq, gte, inArray, lt, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { partners, transactions, users } from "@/db/schema";
import {
  LIKE_ESCAPE,
  likeTerm,
  limitOffset,
  toPage,
  type Page,
  type PageRequest,
} from "@/lib/pagination";

/**
 * The money ledger: the one place any figure about real income comes from.
 *
 * THE INVARIANT IS THE WHOLE DESIGN — one row means money moved. So every read
 * below is a plain `sum(amount_cents) group by currency` over a date range and
 * nothing else. No event allowlist, no `actor <> 'admin'` comp rule, no
 * "…and status = 'paid'". The moment a read here needs a filter to be correct,
 * something has written a row that should not exist.
 *
 * That matters because the rule used to live at the call sites, and they
 * drifted: the admin dashboard counted five billing events, the daily report
 * counted six, and partner income appeared in neither. One sale could also be
 * counted three times, because all three Razorpay deliveries appended their own
 * priced row. `transactions.idempotency_key` is what makes that unrepresentable.
 *
 * WHAT IS NOT IN HERE, deliberately:
 *   - the RUN RATE (`subscriptions.price_cents` over live rows) — that is what
 *     we would bill if everyone renewed, not money that has moved;
 *   - the ORDER LIST on /admin/payments — it exists to show `created` and
 *     `failed` orders, which by definition never became transactions.
 */

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

export type ChargeInput = {
  /**
   * What makes the write idempotent, and the only field with no sensible
   * default. Key on the BILLING CYCLE for subscriptions, never the delivery:
   *   `razorpay:sub:${sub.id}:${currentStart.toISOString()}`
   *   `razorpay:order:${orderId}`
   *   `manual:${crypto.randomUUID()}`
   */
  idempotencyKey: string;
  /** Minor units, POSITIVE. The sign is applied here, from the direction. */
  amountCents: number;
  currency: string;
  /**
   * Who took the money — including the app stores, which take their cut before
   * we ever see it, so `amountCents` here is what the candidate was charged in
   * their storefront rather than what landed in our account.
   */
  provider: PaymentProvider;

  userId?: string | null;
  partnerId?: string | null;
  recordedByUserId?: string | null;
  providerPaymentId?: string | null;
  subscriptionId?: string | null;
  partnerPaymentId?: string | null;
  /** Required when `provider` is "manual" — the database enforces it. */
  note?: string | null;
};

/**
 * Record money arriving. The ONLY writer of a `C` row.
 *
 * Call it from the payment layer, never from `grantPlan`: that function owns
 * entitlement, and it is also what an admin comp goes through. A comp moves no
 * money and must not reach this table.
 *
 * Returns false when the row already existed — the normal outcome for two of
 * the three deliveries of every direct charge, and not an error. The guard is
 * the unique index rather than a read-then-write check because the browser
 * callback and the webhook genuinely arrive at the same instant.
 */
export async function recordCharge(input: ChargeInput): Promise<boolean> {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error(
      `recordCharge: amountCents must be a positive integer, got ${input.amountCents}`,
    );
  }

  const [row] = await db
    .insert(transactions)
    .values({
      direction: "C",
      amountCents: input.amountCents,
      currency: input.currency,
      idempotencyKey: input.idempotencyKey,
      provider: input.provider,
      userId: input.userId ?? null,
      partnerId: input.partnerId ?? null,
      recordedByUserId: input.recordedByUserId ?? null,
      providerPaymentId: input.providerPaymentId ?? null,
      subscriptionId: input.subscriptionId ?? null,
      partnerPaymentId: input.partnerPaymentId ?? null,
      note: input.note ?? null,
    })
    .onConflictDoNothing({ target: transactions.idempotencyKey })
    .returning({ id: transactions.id });

  return Boolean(row);
}

/* ------------------------------------------------------------------ *
 * Reading
 * ------------------------------------------------------------------ */

/**
 * Cents per currency code. Never flattened to one number — an INR total added
 * to a USD total is a number that means nothing.
 */
export type Money = Record<string, number>;

function toMoney(rows: { currency: string; cents: number }[]): Money {
  const out: Money = {};
  for (const r of rows) out[r.currency] = (out[r.currency] ?? 0) + Number(r.cents);
  return out;
}

/** Revenue over a half-open range [from, to). */
export async function revenueBetween(from: Date, to: Date): Promise<Money> {
  const rows = await db
    .select({
      currency: transactions.currency,
      cents: sql<number>`sum(${transactions.amountCents})::int`,
    })
    .from(transactions)
    .where(and(gte(transactions.createdAt, from), lt(transactions.createdAt, to)))
    .groupBy(transactions.currency);

  return toMoney(rows);
}

/**
 * This month's and last month's revenue in ONE query.
 *
 * Two `filter` clauses over a single scan rather than two round trips — this is
 * on the admin dashboard's critical path, alongside four other aggregates.
 */
export async function revenueThisAndLastMonth(
  thisMonthStart: Date,
  lastMonthStart: Date,
  now: Date,
): Promise<{ thisMonth: Money; lastMonth: Money }> {
  const rows = await db
    .select({
      currency: transactions.currency,
      thisMonth: sql<number>`coalesce(sum(${transactions.amountCents}) filter (
        where ${transactions.createdAt} >= ${thisMonthStart.toISOString()}::timestamptz
      ), 0)::int`,
      lastMonth: sql<number>`coalesce(sum(${transactions.amountCents}) filter (
        where ${transactions.createdAt} < ${thisMonthStart.toISOString()}::timestamptz
      ), 0)::int`,
    })
    .from(transactions)
    .where(and(gte(transactions.createdAt, lastMonthStart), lt(transactions.createdAt, now)))
    .groupBy(transactions.currency);

  const thisMonth: Money = {};
  const lastMonth: Money = {};
  for (const r of rows) {
    if (r.thisMonth) thisMonth[r.currency] = Number(r.thisMonth);
    if (r.lastMonth) lastMonth[r.currency] = Number(r.lastMonth);
  }
  return { thisMonth, lastMonth };
}

/** What each of these classes has actually paid us, by currency. */
export async function revenueByPartner(partnerIds: string[]): Promise<Map<string, Money>> {
  if (partnerIds.length === 0) return new Map();

  const rows = await db
    .select({
      partnerId: transactions.partnerId,
      currency: transactions.currency,
      cents: sql<number>`sum(${transactions.amountCents})::int`,
    })
    .from(transactions)
    .where(inArray(transactions.partnerId, partnerIds))
    .groupBy(transactions.partnerId, transactions.currency);

  const out = new Map<string, Money>();
  for (const r of rows) {
    if (!r.partnerId) continue;
    const bucket = out.get(r.partnerId) ?? {};
    bucket[r.currency] = (bucket[r.currency] ?? 0) + Number(r.cents);
    out.set(r.partnerId, bucket);
  }
  return out;
}

export type LedgerRow = {
  createdAt: Date;
  amountCents: number;
  currency: string;
  provider: string;
  note: string | null;
  userName: string | null;
  userEmail: string | null;
  partnerName: string | null;
};

/**
 * Every transaction in a window, named. For the daily report.
 *
 * The joins are in the query rather than a lookup loop afterwards: the report
 * runs on a cron against the pooler, where N+1 round trips cost far more than
 * the join does.
 */
export async function ledgerBetween(from: Date, to: Date): Promise<LedgerRow[]> {
  return db
    .select({
      createdAt: transactions.createdAt,
      amountCents: transactions.amountCents,
      currency: transactions.currency,
      provider: sql<string>`${transactions.provider}::text`,
      note: transactions.note,
      userName: users.name,
      userEmail: users.email,
      partnerName: partners.name,
    })
    .from(transactions)
    .leftJoin(users, eq(users.id, transactions.userId))
    .leftJoin(partners, eq(partners.id, transactions.partnerId))
    .where(and(gte(transactions.createdAt, from), lt(transactions.createdAt, to)))
    .orderBy(desc(transactions.createdAt));
}

/* ------------------------------------------------------------------ *
 * The admin list
 * ------------------------------------------------------------------ */

export const TRANSACTION_FILTERS = ["all", "razorpay", "partner", "manual"] as const;
export type TransactionFilter = (typeof TRANSACTION_FILTERS)[number];
export type TransactionSort = "created" | "amount";
export type TransactionRequest = PageRequest<TransactionSort, TransactionFilter>;

export const TRANSACTION_DEFAULTS = {
  sorts: ["created", "amount"] as const,
  defaultSort: "created" as const,
  defaultDir: "desc" as const,
  filters: TRANSACTION_FILTERS,
  defaultFilter: "all" as TransactionFilter,
};

export type AdminTransactionRow = {
  id: string;
  createdAt: Date;
  amountCents: number;
  currency: string;
  /**
   * Derived from the database enum rather than spelled out, so adding a
   * provider (the app stores did exactly this) widens every reader at once
   * instead of failing here first.
   */
  provider: PaymentProvider;
  providerPaymentId: string | null;
  note: string | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  partnerId: string | null;
  partnerName: string | null;
};

/**
 * The count and the money in ONE pass. Grouped by currency because they are not
 * addable — the page total is the sum of these counts, but the money stays split.
 *
 * The joins are here ONLY when there is a search to apply, because that is the
 * only thing that filters on a name: `q` matches `users.name`, `users.email` and
 * `partners.name`, and without the joins this aggregate would count a different
 * set from the one the list shows. With no search it is a plain scan of one
 * table and its index.
 *
 * This is the second of the screen's two queries, and there is no single-query
 * version of it. `count(*) OVER ()` would give the row total correctly even
 * under LIMIT — but `sum(...) OVER (PARTITION BY currency)` would only surface a
 * currency whose rows happen to appear on the page you are looking at, so a USD
 * total would vanish on page 2. A separate aggregate is the honest answer.
 */
function totalsQuery(where: ReturnType<typeof and> | undefined, joinNames: boolean) {
  const q = db
    .select({
      currency: transactions.currency,
      n: sql<number>`count(*)::int`,
      cents: sql<number>`sum(${transactions.amountCents})::int`,
    })
    .from(transactions)
    .$dynamic();

  if (joinNames) {
    q.leftJoin(users, eq(users.id, transactions.userId)).leftJoin(
      partners,
      eq(partners.id, transactions.partnerId),
    );
  }

  return q.where(where).groupBy(transactions.currency);
}

/**
 * One page of the ledger, plus the totals for everything the filter matches.
 *
 * TWO QUERIES, whatever the page size — the rows, and one aggregate. The names
 * come from LEFT JOINs inside the row query rather than from a second pass over
 * the ids, because a page of 100 transactions fetched that way is 201 round
 * trips to Neon, and this screen is the one an operator leaves open.
 *
 * The totals are deliberately for the WHOLE filtered set, not the visible page:
 * "₹47,679 across 22 sales" is the number somebody came here for, and a total
 * that changed when you turned the page would be worse than no total at all.
 */
export async function adminTransactions(
  req: TransactionRequest,
): Promise<Page<AdminTransactionRow> & { totals: Money }> {
  const clauses = [];
  if (req.filter !== "all") clauses.push(eq(transactions.provider, req.filter));
  if (req.q) {
    const term = likeTerm(req.q);
    clauses.push(
      or(
        sql`${users.name} ilike ${term} escape ${LIKE_ESCAPE}`,
        sql`${users.email} ilike ${term} escape ${LIKE_ESCAPE}`,
        sql`${partners.name} ilike ${term} escape ${LIKE_ESCAPE}`,
        eq(transactions.providerPaymentId, req.q),
      )!,
    );
  }
  const where = clauses.length ? and(...clauses) : undefined;
  const { limit, offset } = limitOffset(req);

  const dir = req.dir === "asc" ? asc : desc;
  const orderBy =
    req.sort === "amount"
      ? [dir(transactions.amountCents), desc(transactions.id)]
      : [dir(transactions.createdAt), desc(transactions.id)];

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: transactions.id,
        createdAt: transactions.createdAt,
        amountCents: transactions.amountCents,
        currency: transactions.currency,
        provider: transactions.provider,
        providerPaymentId: transactions.providerPaymentId,
        note: transactions.note,
        userId: transactions.userId,
        userName: users.name,
        userEmail: users.email,
        partnerId: transactions.partnerId,
        partnerName: partners.name,
      })
      .from(transactions)
      .leftJoin(users, eq(users.id, transactions.userId))
      .leftJoin(partners, eq(partners.id, transactions.partnerId))
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    totalsQuery(where, Boolean(req.q)),
  ]);

  const total = totals.reduce((n, t) => n + Number(t.n), 0);
  return {
    ...toPage(rows, total, req),
    totals: toMoney(totals.map((t) => ({ currency: t.currency, cents: Number(t.cents) }))),
  };
}
