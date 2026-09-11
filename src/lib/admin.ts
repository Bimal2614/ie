import "server-only";

import { and, count, desc, eq, inArray, isNotNull, not, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { coupons, partnerPayments, partners, users, type Coupon } from "@/db/schema";
import { revenueThisAndLastMonth } from "@/lib/payments/transactions";
import {
  LIKE_ESCAPE,
  likeTerm,
  limitOffset,
  toPage,
  type Page,
  type PageRequest,
} from "@/lib/pagination";
import { onAPlan } from "@/lib/partners";
import { effectivePlan, toPlanKey, type PlanKey } from "@/lib/plans";

/**
 * The admin console's own queries — the ones that are NOT scoped to a partner.
 *
 * Everything here is called only from routes that have already passed
 * `requireAdmin()`. Nothing re-checks it, which is exactly why none of it is
 * reachable from the partner panel.
 *
 * SEARCH IS `ILIKE '%term%'` and cannot use a btree index, so it scans the
 * candidate rows. At tens of thousands of users that is milliseconds and the
 * simplest thing that is correct; if the table ever reaches the point where it
 * is not, the fix is a trigram index on name/email, not a rewrite of this.
 */

/* ------------------------------------------------------------------ *
 * Students
 * ------------------------------------------------------------------ */

export const ADMIN_STUDENT_SORTS = ["joined", "name", "lastSeen", "expires"] as const;
export type AdminStudentSort = (typeof ADMIN_STUDENT_SORTS)[number];

export const ADMIN_STUDENT_FILTERS = ["all", "free", "paid", "partner"] as const;
export type AdminStudentFilter = (typeof ADMIN_STUDENT_FILTERS)[number];

export type AdminStudentRequest = PageRequest<AdminStudentSort, AdminStudentFilter>;

export const ADMIN_STUDENT_DEFAULTS = {
  sorts: ADMIN_STUDENT_SORTS,
  defaultSort: "joined" as AdminStudentSort,
  defaultDir: "desc" as const,
  filters: ADMIN_STUDENT_FILTERS,
  defaultFilter: "all" as AdminStudentFilter,
};

export type AdminStudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: PlanKey;
  planExpiresAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  deactivatedAt: Date | null;
  partnerId: string | null;
  partnerName: string | null;
};

const ADMIN_STUDENT_ORDER = {
  joined: users.createdAt,
  name: users.name,
  lastSeen: users.lastLoginAt,
  expires: users.planExpiresAt,
};

function studentWhere(req: AdminStudentRequest, now: Date) {
  const clauses = [
    // Neither an admin nor an institution's login is a candidate, and granting
    // either one a plan buys them nothing.
    eq(users.role, "user"),
  ];

  if (req.q) {
    const term = likeTerm(req.q);
    clauses.push(
      or(
        sql`${users.name} ilike ${term} escape ${LIKE_ESCAPE}`,
        sql`${users.email} ilike ${term} escape ${LIKE_ESCAPE}`,
      )!,
    );
  }

  if (req.filter === "paid") clauses.push(onAPlan(now));
  if (req.filter === "free") clauses.push(not(onAPlan(now)));
  if (req.filter === "partner") clauses.push(isNotNull(users.partnerId));

  return and(...clauses)!;
}

/** One page of candidates, with the class they belong to when they have one. */
export async function adminStudents(
  req: AdminStudentRequest,
  now: Date = new Date(),
): Promise<Page<AdminStudentRow>> {
  const where = studentWhere(req, now);
  const { limit, offset } = limitOffset(req);
  const col = ADMIN_STUDENT_ORDER[req.sort];
  const order =
    req.dir === "asc"
      ? sql`${col} asc nulls last, ${users.id} asc`
      : sql`${col} desc nulls last, ${users.id} asc`;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        plan: users.plan,
        planExpiresAt: users.planExpiresAt,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        deactivatedAt: users.deactivatedAt,
        partnerId: users.partnerId,
        partnerName: partners.name,
      })
      .from(users)
      .leftJoin(partners, eq(partners.id, users.partnerId))
      .where(where)
      .orderBy(order)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(users).where(where),
  ]);

  return toPage(
    rows.map((u) => ({
      ...u,
      plan: effectivePlan(toPlanKey(u.plan), u.planExpiresAt, now),
    })),
    totals[0]?.total ?? 0,
    req,
  );
}

/* ------------------------------------------------------------------ *
 * Payments
 * ------------------------------------------------------------------ */

export const PAYMENT_FILTERS = ["all", "paid", "created", "failed"] as const;
export type PaymentFilter = (typeof PAYMENT_FILTERS)[number];
export type PaymentRequest = PageRequest<"created", PaymentFilter>;

export const PAYMENT_DEFAULTS = {
  sorts: ["created"] as const,
  defaultSort: "created" as const,
  defaultDir: "desc" as const,
  filters: PAYMENT_FILTERS,
  defaultFilter: "all" as PaymentFilter,
};

export type AdminPaymentRow = {
  id: string;
  status: "created" | "paid" | "failed";
  plan: PlanKey;
  amountCents: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  paidAt: Date | null;
  createdAt: Date;
  studentName: string | null;
  studentUserId: string | null;
  partnerId: string;
  partnerName: string | null;
};

/** Every partner payment, newest first. The full history the detail page trims. */
export async function adminPayments(req: PaymentRequest): Promise<Page<AdminPaymentRow>> {
  const clauses = [];
  if (req.filter !== "all") clauses.push(eq(partnerPayments.status, req.filter));
  if (req.q) {
    const term = likeTerm(req.q);
    clauses.push(
      or(
        sql`${users.name} ilike ${term} escape ${LIKE_ESCAPE}`,
        sql`${partners.name} ilike ${term} escape ${LIKE_ESCAPE}`,
        eq(partnerPayments.razorpayOrderId, req.q),
      )!,
    );
  }
  const where = clauses.length ? and(...clauses) : undefined;
  const { limit, offset } = limitOffset(req);

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: partnerPayments.id,
        status: partnerPayments.status,
        plan: partnerPayments.plan,
        amountCents: partnerPayments.amountCents,
        currency: partnerPayments.currency,
        razorpayOrderId: partnerPayments.razorpayOrderId,
        razorpayPaymentId: partnerPayments.razorpayPaymentId,
        paidAt: partnerPayments.paidAt,
        createdAt: partnerPayments.createdAt,
        studentName: users.name,
        studentUserId: partnerPayments.studentUserId,
        partnerId: partnerPayments.partnerId,
        partnerName: partners.name,
      })
      .from(partnerPayments)
      .leftJoin(users, eq(users.id, partnerPayments.studentUserId))
      .leftJoin(partners, eq(partners.id, partnerPayments.partnerId))
      .where(where)
      .orderBy(desc(partnerPayments.createdAt), desc(partnerPayments.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(partnerPayments)
      .leftJoin(users, eq(users.id, partnerPayments.studentUserId))
      .leftJoin(partners, eq(partners.id, partnerPayments.partnerId))
      .where(where),
  ]);

  return toPage(
    rows.map((r) => ({ ...r, plan: toPlanKey(r.plan) })),
    totals[0]?.total ?? 0,
    req,
  );
}

/* ------------------------------------------------------------------ *
 * The overview
 * ------------------------------------------------------------------ */

export type Money = Record<string, number>;

export type AdminDashboard = {
  money: {
    thisMonth: Money;
    lastMonth: Money;
    /** Accounts entitled right now, by the same rule every gate applies. */
    onAPlan: number;
    lapsing30: number;
  };
  partners: { total: number; active: number; suspended: number; students: number };
  students: { total: number; newToday: number; newThisWeek: number; signedInThisWeek: number };
  action: { abandoned: number; failed: number; deactivated: number; lapsing7: number };
};

const DAY_MS = 24 * 60 * 60 * 1000;

function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Everything the admin home shows, in five queries.
 *
 * Each one is a single aggregate over a table we already index — no joins into
 * `user_responses`, which is the big table and the one that would make this
 * screen slow. "Signed in this week" therefore comes from `users.last_login_at`
 * rather than from practice activity: a cheaper question with almost the same
 * answer.
 */
export async function adminDashboard(now: Date = new Date()): Promise<AdminDashboard> {
  const thisMonthStart = monthStart(now);
  const lastMonthStart = monthStart(new Date(thisMonthStart.getTime() - DAY_MS));
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const in7 = new Date(now.getTime() + 7 * DAY_MS);
  const in30 = new Date(now.getTime() + 30 * DAY_MS);
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString();

  const [revenue, planCounts, partnerCounts, studentCounts, actionCounts] = await Promise.all([
    /*
     * Revenue comes from `transactions` and nowhere else — one row there means
     * money moved, so there is no event list to keep in step with the daily
     * report's, and no comp rule to reapply. This used to read
     * `subscription_logs` through five event types plus `actor <> 'admin'`,
     * and partner income was missing from it entirely.
     */
    revenueThisAndLastMonth(thisMonthStart, lastMonthStart, now),
    db
      .select({
        onAPlan: count(),
        lapsing30: sql<number>`count(*) filter (
          where ${users.planExpiresAt} <= ${iso(in30)}::timestamptz
        )::int`,
        lapsing7: sql<number>`count(*) filter (
          where ${users.planExpiresAt} <= ${iso(in7)}::timestamptz
        )::int`,
      })
      .from(users)
      .where(and(eq(users.role, "user"), onAPlan(now))),
    db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${partners.status} = 'active')::int`,
      })
      .from(partners),
    db
      .select({
        total: count(),
        newToday: sql<number>`count(*) filter (
          where ${users.createdAt} >= ${iso(todayStart)}::timestamptz
        )::int`,
        newThisWeek: sql<number>`count(*) filter (
          where ${users.createdAt} >= ${iso(weekAgo)}::timestamptz
        )::int`,
        signedInThisWeek: sql<number>`count(*) filter (
          where ${users.lastLoginAt} >= ${iso(weekAgo)}::timestamptz
        )::int`,
        deactivated: sql<number>`count(*) filter (where ${users.deactivatedAt} is not null)::int`,
        withPartner: sql<number>`count(*) filter (where ${users.partnerId} is not null)::int`,
      })
      .from(users)
      .where(eq(users.role, "user")),
    db
      .select({
        // Old enough that the class has clearly walked away from it, so a
        // checkout someone is filling in right now is not shown as a problem.
        abandoned: sql<number>`count(*) filter (
          where ${partnerPayments.status} = 'created'
            and ${partnerPayments.createdAt} < ${iso(hourAgo)}::timestamptz
        )::int`,
        failed: sql<number>`count(*) filter (where ${partnerPayments.status} = 'failed')::int`,
      })
      .from(partnerPayments),
  ]);

  const { thisMonth, lastMonth } = revenue;

  return {
    money: {
      thisMonth,
      lastMonth,
      onAPlan: planCounts[0]?.onAPlan ?? 0,
      lapsing30: planCounts[0]?.lapsing30 ?? 0,
    },
    partners: {
      total: partnerCounts[0]?.total ?? 0,
      active: partnerCounts[0]?.active ?? 0,
      suspended: (partnerCounts[0]?.total ?? 0) - (partnerCounts[0]?.active ?? 0),
      students: studentCounts[0]?.withPartner ?? 0,
    },
    students: {
      total: studentCounts[0]?.total ?? 0,
      newToday: studentCounts[0]?.newToday ?? 0,
      newThisWeek: studentCounts[0]?.newThisWeek ?? 0,
      signedInThisWeek: studentCounts[0]?.signedInThisWeek ?? 0,
    },
    action: {
      abandoned: actionCounts[0]?.abandoned ?? 0,
      failed: actionCounts[0]?.failed ?? 0,
      deactivated: studentCounts[0]?.deactivated ?? 0,
      lapsing7: planCounts[0]?.lapsing7 ?? 0,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Coupons
 *
 * A coupon is a DEAL, not a partner's column: several classes can be put on
 * the same terms and taken off them together. Nobody types one — see the note
 * on the table in src/db/schema.ts.
 * ------------------------------------------------------------------ */

export const COUPON_FILTERS = ["all", "active", "inactive"] as const;
export type CouponFilter = (typeof COUPON_FILTERS)[number];
export type CouponRequest = PageRequest<"created" | "code", CouponFilter>;

export const COUPON_DEFAULTS = {
  sorts: ["created", "code"] as const,
  defaultSort: "created" as const,
  defaultDir: "desc" as const,
  filters: COUPON_FILTERS,
  defaultFilter: "all" as CouponFilter,
};

export type CouponRow = Coupon & {
  /** How many classes are on this deal right now. */
  partners: number;
  /** Live = active, and not past its end date. What the panel shows as a dot. */
  live: boolean;
};

/** One page of coupons, each with the number of classes holding it. */
export async function listCoupons(
  req: CouponRequest,
  now: Date = new Date(),
): Promise<Page<CouponRow>> {
  const clauses = [];
  if (req.filter !== "all") clauses.push(eq(coupons.status, req.filter));
  if (req.q) clauses.push(sql`${coupons.code} ilike ${likeTerm(req.q)} escape ${LIKE_ESCAPE}`);
  const where = clauses.length ? and(...clauses) : undefined;

  const col = req.sort === "code" ? coupons.code : coupons.createdAt;
  const order = req.dir === "asc" ? sql`${col} asc` : sql`${col} desc`;
  const { limit, offset } = limitOffset(req);

  const [rows, totals] = await Promise.all([
    db.select().from(coupons).where(where).orderBy(order).limit(limit).offset(offset),
    db.select({ total: count() }).from(coupons).where(where),
  ]);

  if (rows.length === 0) return toPage<CouponRow>([], totals[0]?.total ?? 0, req);

  // Scoped to the page, like every other count in this file.
  const holders = await db
    .select({ couponId: partners.couponId, holders: count() })
    .from(partners)
    .where(inArray(partners.couponId, rows.map((c) => c.id)))
    .groupBy(partners.couponId);
  const holdersBy = new Map(holders.filter((h) => h.couponId).map((h) => [h.couponId!, h.holders]));

  return toPage(
    rows.map((c) => ({
      ...c,
      partners: holdersBy.get(c.id) ?? 0,
      live: c.status === "active" && (!c.endsAt || c.endsAt > now),
    })),
    totals[0]?.total ?? 0,
    req,
  );
}

/** Every coupon, for the assign dropdown on a partner. Few rows; no paging. */
export async function couponOptions(): Promise<Coupon[]> {
  return db.select().from(coupons).orderBy(coupons.code);
}
