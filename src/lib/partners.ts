import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { and, count, desc, eq, gt, inArray, isNull, ne, not, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  auditLog,
  coupons,
  mockTestResults,
  partnerPayments,
  partners,
  userResponses,
  users,
  type Coupon,
  type Partner,
} from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import {
  LIKE_ESCAPE,
  likeTerm,
  limitOffset,
  toPage,
  type Page,
  type PageRequest,
} from "@/lib/pagination";
import { requirePartner, type PartnerUser } from "@/lib/dal";
import type { PartnerRate } from "@/lib/partner-pricing";
import { effectivePlan, toPlanKey, type PlanKey } from "@/lib/plans";
import { hashPassword } from "@/lib/security/password";
import { destroyAllSessions } from "@/lib/session";

/**
 * Partners — the institutions we have onboarded, and the students they enrol.
 *
 * EVERY READ IN THIS FILE IS SCOPED BY `partnerId`, and that id comes from the
 * session (`requirePartner`), never from an argument a page passed down. A
 * function here that trusted its caller for the scope would be one crafted POST
 * away from showing one class another class's students, so the two functions a
 * partner screen actually calls — `partnerStudents` and `partnerStudentDetail` —
 * take the id and then re-check that the row they found belongs to it.
 *
 * The panel is a handful of screens over at most a few hundred students, so
 * everything here is a live query against the indexes in src/db/schema.ts.
 * There is no snapshot table and no cache: a class that has just enrolled a
 * student expects to see them, and a stale count is worse than a fast one.
 */


/* ------------------------------------------------------------------ *
 * The signed-in partner
 * ------------------------------------------------------------------ */

export type PartnerContext = { user: PartnerUser; partner: Partner; rate: PartnerRate };

/**
 * A coupon as a usable rate, or nothing.
 *
 * ONE PLACE DECIDES WHETHER A DEAL IS LIVE. A coupon that has been deactivated
 * or has run past its end date is not a smaller price, it is no price at all —
 * and if the panel and the checkout answered that question separately, a class
 * would eventually be quoted one number and charged another.
 */
export function rateOf(coupon: Coupon | null | undefined, now: Date = new Date()): PartnerRate {
  if (!coupon || coupon.status !== "active") return null;
  if (coupon.endsAt && coupon.endsAt <= now) return null;
  return { code: coupon.code, percent: coupon.percent };
}

/**
 * The institution behind the current session, and the rate it buys at.
 *
 * A SUSPENDED PARTNER IS NOT LOCKED OUT, it is made read-only — see
 * `assertActive` below. Signing them out entirely would take away the roster
 * and results of students who have already been paid for, which is not what
 * ending a commercial relationship should cost the students.
 *
 * `cache()`d for the render pass, exactly as `getCurrentUser` is, so a layout,
 * a page and a component asking for it cost one query between them — and all
 * three see the same price.
 */
export const partnerContext = cache(async (): Promise<PartnerContext> => {
  const user = await requirePartner();
  const [row] = await db
    .select({ partner: partners, coupon: coupons })
    .from(partners)
    .leftJoin(coupons, eq(coupons.id, partners.couponId))
    .where(eq(partners.id, user.partnerId))
    .limit(1);

  // `users.partner_id` is SET NULL on delete, so a login can in principle
  // outlive its institution. There is nothing to show it: sign it out.
  if (!row) redirect("/logout");

  return { user, partner: row.partner, rate: rateOf(row.coupon) };
});

export class PartnerSuspendedError extends Error {
  constructor() {
    super("This account is suspended.");
    this.name = "PartnerSuspendedError";
  }
}

/** Guard every WRITE a partner makes. Reads stay open while suspended. */
export function assertActive(partner: Partner): void {
  if (partner.status !== "active") throw new PartnerSuspendedError();
}

/* ------------------------------------------------------------------ *
 * The roster
 * ------------------------------------------------------------------ */

export type PartnerStudentPayment = {
  status: "created" | "paid" | "failed";
  plan: PlanKey;
  amountCents: number;
  currency: string;
  createdAt: Date;
};

export type PartnerStudent = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  targetModule: "academic" | "general";
  targetBand: string | null;
  /**
   * What the account is entitled to RIGHT NOW — the expiry is already applied,
   * so a lapsed student reads as "free" here in the window before the nightly
   * sweep rewrites the column, exactly as they do at every gate in the app.
   */
  plan: PlanKey;
  planExpiresAt: Date | null;
  joinedAt: Date;
  lastLoginAt: Date | null;

  /** Practice activity, so a roster row shows progress without a click. */
  attempts: number;
  avgBand: number | null;
  mocks: number;
  bestMockBand: number | null;
  lastActiveAt: Date | null;

  /** The most recent payment this class started for them, paid or not. */
  payment: PartnerStudentPayment | null;
};

const studentColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  targetModule: users.targetModule,
  targetBand: users.targetBand,
  plan: users.plan,
  planExpiresAt: users.planExpiresAt,
  createdAt: users.createdAt,
  lastLoginAt: users.lastLoginAt,
};

/**
 * Practice, mock and payment aggregates for a set of students, in three
 * grouped queries.
 *
 * NOT one query per student. A roster of 200 rendered that way is 600 round
 * trips for a screen meant to load in one; grouped over the roster's ids it is
 * three, each served by an index that already exists —
 * `user_responses_user_created_idx`, `mock_results_user_idx` and
 * `partner_payments_student_idx`.
 */
async function activityFor(ids: string[]) {
  const [practice, mocks, payments] = await Promise.all([
    db
      .select({
        userId: userResponses.userId,
        attempts: sql<number>`count(distinct ${userResponses.attemptId})::int`,
        avgBand: sql<number | null>`avg(${userResponses.band})::float`,
        lastAt: sql<Date | null>`max(${userResponses.createdAt})`,
      })
      .from(userResponses)
      .where(inArray(userResponses.userId, ids))
      .groupBy(userResponses.userId),
    db
      .select({
        userId: mockTestResults.userId,
        taken: sql<number>`count(*)::int`,
        best: sql<number | null>`max(${mockTestResults.overallBand})::float`,
      })
      .from(mockTestResults)
      .where(inArray(mockTestResults.userId, ids))
      .groupBy(mockTestResults.userId),
    // Newest first, so the first row seen for a student is their latest attempt
    // to pay. A student has one row per term bought, so taking the head in JS
    // is cheaper than a window function and reads as what it is.
    db
      .select({
        studentUserId: partnerPayments.studentUserId,
        status: partnerPayments.status,
        plan: partnerPayments.plan,
        amountCents: partnerPayments.amountCents,
        currency: partnerPayments.currency,
        createdAt: partnerPayments.createdAt,
      })
      .from(partnerPayments)
      .where(inArray(partnerPayments.studentUserId, ids))
      .orderBy(desc(partnerPayments.createdAt)),
  ]);

  const latestPayment = new Map<string, PartnerStudentPayment>();
  for (const p of payments) {
    if (!p.studentUserId || latestPayment.has(p.studentUserId)) continue;
    latestPayment.set(p.studentUserId, {
      status: p.status,
      plan: toPlanKey(p.plan),
      amountCents: p.amountCents,
      currency: p.currency,
      createdAt: p.createdAt,
    });
  }

  return {
    practice: new Map(practice.map((r) => [r.userId, r])),
    mocks: new Map(mocks.map((r) => [r.userId, r])),
    latestPayment,
  };
}

/* ------------------------------------------------------------------ *
 * Searching, filtering and sorting the roster
 *
 * ALL THREE HAPPEN IN POSTGRES, not in the browser. A class grows by a batch a
 * month — 40 students today is 600 in five years — so a screen that fetched the
 * roster and filtered it client-side would, at exactly the size where search
 * starts to matter, be searching only the rows that happened to fit.
 * ------------------------------------------------------------------ */

/**
 * What a roster may be ordered by: columns ON `users`, and only those.
 *
 * Attempts, average band and last-active are deliberately absent. They come
 * from `user_responses` and are computed per PAGE, so ordering by one would
 * mean aggregating every student in the class on every keystroke just to learn
 * who belongs on page 1. The panel offers them as figures, not as sorts.
 */
export const STUDENT_SORTS = ["joined", "name", "lastSeen", "expires"] as const;
export type StudentSort = (typeof STUDENT_SORTS)[number];

export const STUDENT_FILTERS = ["all", "unpaid", "active", "never"] as const;
export type StudentFilter = (typeof STUDENT_FILTERS)[number];

export type StudentPageRequest = PageRequest<StudentSort, StudentFilter>;

/** What `parsePageRequest` clamps a roster URL against. */
export const STUDENT_LIST_DEFAULTS = {
  sorts: STUDENT_SORTS,
  defaultSort: "joined" as StudentSort,
  defaultDir: "desc" as const,
  filters: STUDENT_FILTERS,
  defaultFilter: "all" as StudentFilter,
};

/** Looked up by key, never built from the wire. */
const STUDENT_ORDER = {
  joined: users.createdAt,
  name: users.name,
  lastSeen: users.lastLoginAt,
  expires: users.planExpiresAt,
};

/**
 * "Entitled right now", in SQL — the same rule `effectivePlan` applies in TS.
 *
 * The unpaid tab is the exact NOT of this rather than a predicate of its own,
 * so the two tabs partition the roster. Written separately they drift, and a
 * student then goes missing from both.
 */
export function onAPlan(now: Date) {
  return and(
    ne(users.plan, "free"),
    or(isNull(users.planExpiresAt), gt(users.planExpiresAt, now)),
  )!;
}

function studentWhere(partnerId: string, req: StudentPageRequest, now: Date) {
  const clauses = [
    eq(users.partnerId, partnerId),
    // `role` as well as `partner_id`: the class's own login carries the same
    // partner id, and listing it as one of its own students is how a roster
    // ends up with a "student" who has never practised anything.
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

  if (req.filter === "active") clauses.push(onAPlan(now));
  if (req.filter === "unpaid") clauses.push(not(onAPlan(now)));
  if (req.filter === "never") clauses.push(isNull(users.lastLoginAt));

  return and(...clauses)!;
}

/**
 * NULLS LAST in both directions, and a tiebreak on id.
 *
 * "Never signed in" and "never lapses" are absences: sorted to the top of a
 * list about recency they read as an error. The id tiebreak is the one that
 * matters for correctness — a batch enrolled together shares a timestamp to the
 * second, and with no stable second key Postgres may order those rows
 * differently between two queries, which repeats a student on page 2 and drops
 * another one entirely.
 */
function studentOrder(req: StudentPageRequest) {
  const col = STUDENT_ORDER[req.sort];
  return req.dir === "asc"
    ? sql`${col} asc nulls last, ${users.id} asc`
    : sql`${col} desc nulls last, ${users.id} asc`;
}

/** One page of a class's students, with the total the pager needs. */
export async function partnerStudents(
  partnerId: string,
  req: StudentPageRequest,
  now: Date = new Date(),
): Promise<Page<PartnerStudent>> {
  const where = studentWhere(partnerId, req, now);
  const { limit, offset } = limitOffset(req);

  const [rows, totals] = await Promise.all([
    db
      .select(studentColumns)
      .from(users)
      .where(where)
      .orderBy(studentOrder(req))
      .limit(limit)
      .offset(offset),
    // The count runs against the SAME predicate, so "812 students" always
    // describes the list being shown rather than the table behind it.
    db.select({ total: count() }).from(users).where(where),
  ]);

  const total = totals[0]?.total ?? 0;
  if (rows.length === 0) return toPage<PartnerStudent>([], total, req);

  const { practice, mocks, latestPayment } = await activityFor(rows.map((r) => r.id));

  const mapped = rows.map((u) => {
    const p = practice.get(u.id);
    const m = mocks.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      targetModule: u.targetModule,
      targetBand: u.targetBand,
      plan: effectivePlan(toPlanKey(u.plan), u.planExpiresAt, now),
      planExpiresAt: u.planExpiresAt,
      joinedAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      attempts: p?.attempts ?? 0,
      avgBand: p?.avgBand ?? null,
      mocks: m?.taken ?? 0,
      bestMockBand: m?.best ?? null,
      lastActiveAt: p?.lastAt ?? null,
      payment: latestPayment.get(u.id) ?? null,
    };
  });

  return toPage(mapped, total, req);
}

/* ------------------------------------------------------------------ *
 * The overview
 * ------------------------------------------------------------------ */

export type PartnerOverview = {
  students: number;
  /** On a paid tier right now. */
  paid: number;
  /** Enrolled but not on a plan — the panel's call to action. */
  awaitingPayment: number;
  /** Paid, but lapsing within a fortnight. */
  expiringSoon: number;
  /** Never signed in — the credentials never reached the student. */
  neverSignedIn: number;
};

const FORTNIGHT_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * The class's headline numbers, in ONE query over `users`.
 *
 * SEPARATE FROM THE ROSTER, now that the roster is a page. Tiles derived from
 * the loaded rows would say "50 students" to a class of 600 — the one thing a
 * summary must never do.
 *
 * Every figure here is a fact about the users table, so this is a single
 * aggregate with no joins. Engagement — attempts, average band, who practised
 * this week — is deliberately NOT here: each would need `user_responses`, and
 * the table already shows them per student on the page you are looking at.
 */
export async function partnerOverview(
  partnerId: string,
  now: Date = new Date(),
): Promise<PartnerOverview> {
  // ISO strings with an explicit cast, never a Date: a Date interpolated into a
  // raw `sql` fragment reaches postgres-js with no type and it refuses to
  // serialise it, at runtime, from a query that compiles perfectly.
  const nowIso = now.toISOString();
  const soonIso = new Date(now.getTime() + FORTNIGHT_MS).toISOString();

  const [row] = await db
    .select({
      students: count(),
      paid: sql<number>`count(*) filter (
        where ${users.plan} <> 'free'
          and (${users.planExpiresAt} is null or ${users.planExpiresAt} > ${nowIso}::timestamptz)
      )::int`,
      expiringSoon: sql<number>`count(*) filter (
        where ${users.plan} <> 'free'
          and ${users.planExpiresAt} > ${nowIso}::timestamptz
          and ${users.planExpiresAt} <= ${soonIso}::timestamptz
      )::int`,
      neverSignedIn: sql<number>`count(*) filter (where ${users.lastLoginAt} is null)::int`,
    })
    .from(users)
    .where(and(eq(users.partnerId, partnerId), eq(users.role, "user")));

  const students = row?.students ?? 0;
  const paid = row?.paid ?? 0;

  return {
    students,
    paid,
    // Derived, not counted again: "not on a plan" is the complement of "on
    // one", and two counts that could disagree is one too many.
    awaitingPayment: students - paid,
    expiringSoon: row?.expiringSoon ?? 0,
    neverSignedIn: row?.neverSignedIn ?? 0,
  };
}

/* ------------------------------------------------------------------ *
 * One student
 * ------------------------------------------------------------------ */

export type SectionProgress = {
  section: "listening" | "reading" | "writing" | "speaking";
  attempts: number;
  answers: number;
  graded: number;
  correct: number;
  avgBand: number | null;
  lastAt: Date | null;
};

export type StudentAttempt = {
  attemptId: string;
  section: string;
  questionType: string;
  answers: number;
  correct: number;
  avgBand: number | null;
  at: Date;
};

export type StudentPaymentRow = {
  id: string;
  status: "created" | "paid" | "failed";
  plan: PlanKey;
  amountCents: number;
  currency: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  paidAt: Date | null;
  createdAt: Date;
};

export type PartnerStudentDetail = {
  student: PartnerStudent;
  sections: SectionProgress[];
  attempts: StudentAttempt[];
  mocks: Array<{
    id: string;
    module: string;
    overallBand: string | null;
    listeningBand: string | null;
    readingBand: string | null;
    writingBand: string | null;
    speakingBand: string | null;
    at: Date;
  }>;
  payments: StudentPaymentRow[];
};

/**
 * One student's record, or null when they are not this partner's to see.
 *
 * THE NULL IS THE ACCESS CHECK. The student id arrives from a URL, so the
 * `partner_id` predicate below is what stops /partner/students/<somebody
 * else's uuid> from being a working page. The caller renders a 404 rather than
 * an error, so a partner cannot even learn which ids exist.
 */
export async function partnerStudentDetail(
  partnerId: string,
  studentId: string,
  now: Date = new Date(),
): Promise<PartnerStudentDetail | null> {
  const [row] = await db
    .select(studentColumns)
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.partnerId, partnerId), eq(users.role, "user")))
    .limit(1);
  if (!row) return null;

  const [activity, sections, attempts, mockRows, payments] = await Promise.all([
    activityFor([row.id]),
    db
      .select({
        section: userResponses.section,
        attempts: sql<number>`count(distinct ${userResponses.attemptId})::int`,
        answers: sql<number>`count(*)::int`,
        graded: sql<number>`count(*) filter (where ${userResponses.isCorrect} is not null or ${userResponses.band} is not null)::int`,
        correct: sql<number>`count(*) filter (where ${userResponses.isCorrect})::int`,
        avgBand: sql<number | null>`avg(${userResponses.band})::float`,
        lastAt: sql<Date | null>`max(${userResponses.createdAt})`,
      })
      .from(userResponses)
      .where(eq(userResponses.userId, studentId))
      .groupBy(userResponses.section),
    // One row per SUBMIT, not per gap — a four-gap table is one thing the
    // student did, and listing its rows fills the feed with four of it.
    db
      .select({
        attemptId: userResponses.attemptId,
        section: userResponses.section,
        questionType: userResponses.questionType,
        answers: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where ${userResponses.isCorrect})::int`,
        avgBand: sql<number | null>`avg(${userResponses.band})::float`,
        at: sql<Date>`max(${userResponses.createdAt})`,
      })
      .from(userResponses)
      .where(eq(userResponses.userId, studentId))
      .groupBy(userResponses.attemptId, userResponses.section, userResponses.questionType)
      .orderBy(sql`max(${userResponses.createdAt}) desc`)
      .limit(20),
    db
      .select({
        id: mockTestResults.id,
        module: mockTestResults.module,
        overallBand: mockTestResults.overallBand,
        listeningBand: mockTestResults.listeningBand,
        readingBand: mockTestResults.readingBand,
        writingBand: mockTestResults.writingBand,
        speakingBand: mockTestResults.speakingBand,
        at: mockTestResults.createdAt,
      })
      .from(mockTestResults)
      .where(eq(mockTestResults.userId, studentId))
      .orderBy(desc(mockTestResults.createdAt))
      .limit(10),
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
      })
      .from(partnerPayments)
      .where(
        and(eq(partnerPayments.studentUserId, studentId), eq(partnerPayments.partnerId, partnerId)),
      )
      .orderBy(desc(partnerPayments.createdAt))
      // Bounded like every other list here. One row per term bought, so fifty is
      // a decade of a student nobody could actually have — but an unbounded
      // query on a page is a habit worth not having.
      .limit(50),
  ]);

  const p = activity.practice.get(row.id);
  const m = activity.mocks.get(row.id);

  return {
    student: {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      targetModule: row.targetModule,
      targetBand: row.targetBand,
      plan: effectivePlan(toPlanKey(row.plan), row.planExpiresAt, now),
      planExpiresAt: row.planExpiresAt,
      joinedAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
      attempts: p?.attempts ?? 0,
      avgBand: p?.avgBand ?? null,
      mocks: m?.taken ?? 0,
      bestMockBand: m?.best ?? null,
      lastActiveAt: p?.lastAt ?? null,
      payment: activity.latestPayment.get(row.id) ?? null,
    },
    sections,
    attempts,
    mocks: mockRows,
    payments: payments.map((r) => ({ ...r, plan: toPlanKey(r.plan) })),
  };
}

/* ------------------------------------------------------------------ *
 * Writes — enrolling, and the credentials that come with it
 * ------------------------------------------------------------------ */

export type EnrolInput = {
  partnerId: string;
  /** The partner login that pressed the button, for the audit trail. */
  createdByUserId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  targetModule: "academic" | "general";
  targetBand?: string | null;
};

export type EnrolResult = { ok: true; studentId: string } | { ok: false; error: "email_taken" };

/**
 * Enrol a student under a partner.
 *
 * THE ACCOUNT IS CREATED BEFORE ANY MONEY MOVES, on the free tier, and that
 * order is deliberate. The reverse — take the payment, then create the account —
 * risks money with nothing to attach it to; this way an abandoned checkout
 * leaves a real student the class can pay for later from the roster, which is
 * the state the panel is built to show.
 *
 * NO EMAIL IS SENT AND NOTHING IS VERIFIED. The class types the address and
 * hands the password over in the room; `email_verified` stays false, which
 * nothing in the app gates on (see the note in the signup action).
 */
export async function enrolStudent(input: EnrolInput): Promise<EnrolResult> {
  const passwordHash = await hashPassword(input.password);
  const email = input.email.trim().toLowerCase();

  let studentId: string;
  try {
    const [created] = await db
      .insert(users)
      .values({
        name: input.name,
        email,
        emailNormalized: email,
        phone: input.phone,
        passwordHash,
        role: "user",
        partnerId: input.partnerId,
        targetModule: input.targetModule,
        targetBand: input.targetBand ?? null,
      })
      .returning({ id: users.id });
    studentId = created.id;
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "email_taken" };
    throw err;
  }

  try {
    await db.insert(auditLog).values({
      userId: studentId,
      event: "partner.student.enrolled",
      metadata: { partnerId: input.partnerId, by: input.createdByUserId },
    });
  } catch {
    // The audit trail must never be what fails an enrolment.
  }

  return { ok: true, studentId };
}

/**
 * Set a password for someone in a partner's care — a student who has forgotten
 * theirs, or the class's own login being rotated by an admin.
 *
 * Every session of that account is revoked in the same breath: a password
 * change that leaves the old session usable has not actually taken the account
 * back from whoever knew the old password.
 */
export async function setPasswordFor(userId: string, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  const now = new Date();
  await db
    .update(users)
    .set({
      passwordHash,
      passwordChangedAt: now,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: now,
    })
    .where(eq(users.id, userId));
  await destroyAllSessions(userId);
}

/** True when this user is a student of this partner — the scope check for a write. */
export async function ownsStudent(partnerId: string, studentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, studentId), eq(users.partnerId, partnerId), eq(users.role, "user")))
    .limit(1);
  return Boolean(row);
}

/* ================================================================== *
 * ADMIN
 *
 * The other side of the panel: our own screens, which are NOT scoped to one
 * institution. Everything below is called only from routes that have already
 * passed `requireAdmin()`; nothing here re-checks it, which is why none of it
 * is exported to a partner screen.
 * ================================================================== */

export type PartnerLogin = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  lastLoginAt: Date | null;
  deactivatedAt: Date | null;
};

export type AdminPartnerRow = Partner & {
  /** The credentials handed over at onboarding. NULL only if one was deleted. */
  login: PartnerLogin | null;
  /** The rate this class buys at, already resolved against the coupon's status
   *  and end date — so the list shows what would actually be charged today. */
  rate: PartnerRate;
  students: number;
  paidStudents: number;
  /**
   * Kept PER CURRENCY. Adding paise to cents produces a number that is wrong in
   * both, and the mistake is invisible until someone reconciles it against a
   * bank statement.
   */
  revenue: Record<string, number>;
};

export const PARTNER_SORTS = ["onboarded", "name"] as const;
export type PartnerSort = (typeof PARTNER_SORTS)[number];

export const PARTNER_FILTERS = ["all", "active", "suspended"] as const;
export type PartnerFilter = (typeof PARTNER_FILTERS)[number];

export type PartnerPageRequest = PageRequest<PartnerSort, PartnerFilter>;

export const PARTNER_LIST_DEFAULTS = {
  sorts: PARTNER_SORTS,
  defaultSort: "onboarded" as PartnerSort,
  defaultDir: "desc" as const,
  filters: PARTNER_FILTERS,
  defaultFilter: "all" as PartnerFilter,
};

/**
 * One page of partners, with the figures the admin list shows.
 *
 * THE PAGE IS FETCHED FIRST, AND EVERYTHING ELSE IS LOOKED UP FOR ITS IDS.
 * Counting students for every partner in one grouped pass — as this did — put a
 * scan of the WHOLE users table on a screen that shows twenty rows: the cost
 * grew with total signups rather than with the number of partners. Scoped to a
 * page it is three small indexed lookups, and it stays that way at any scale.
 */
export async function listPartnersForAdmin(
  req: PartnerPageRequest,
  now: Date = new Date(),
): Promise<Page<AdminPartnerRow>> {
  const clauses = [];
  if (req.q) {
    clauses.push(sql`${partners.name} ilike ${likeTerm(req.q)} escape ${LIKE_ESCAPE}`);
  }
  if (req.filter !== "all") clauses.push(eq(partners.status, req.filter));
  const where = clauses.length ? and(...clauses) : undefined;

  const col = req.sort === "name" ? partners.name : partners.createdAt;
  const order = req.dir === "asc" ? sql`${col} asc, ${partners.id} asc` : sql`${col} desc, ${partners.id} asc`;
  const { limit, offset } = limitOffset(req);

  const [rows, totals] = await Promise.all([
    db
      .select({ partner: partners, coupon: coupons })
      .from(partners)
      .leftJoin(coupons, eq(coupons.id, partners.couponId))
      .where(where)
      .orderBy(order)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(partners).where(where),
  ]);

  const total = totals[0]?.total ?? 0;
  if (rows.length === 0) return toPage<AdminPartnerRow>([], total, req);

  const ids = rows.map((r) => r.partner.id);
  const nowIso = now.toISOString();

  const [logins, counts, revenue] = await Promise.all([
    db
      .select({
        partnerId: users.partnerId,
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        lastLoginAt: users.lastLoginAt,
        deactivatedAt: users.deactivatedAt,
      })
      .from(users)
      .where(and(inArray(users.partnerId, ids), eq(users.role, "partner")))
      .orderBy(users.createdAt),
    db
      .select({
        partnerId: users.partnerId,
        students: count(),
        // The same rule `effectivePlan` applies, in SQL: a paid tier whose
        // window has closed is free, whatever the column still says.
        paid: sql<number>`count(*) filter (
          where ${users.plan} <> 'free'
            and (${users.planExpiresAt} is null or ${users.planExpiresAt} > ${nowIso}::timestamptz)
        )::int`,
      })
      .from(users)
      .where(and(inArray(users.partnerId, ids), eq(users.role, "user")))
      .groupBy(users.partnerId),
    db
      .select({
        partnerId: partnerPayments.partnerId,
        currency: partnerPayments.currency,
        cents: sql<number>`sum(${partnerPayments.amountCents})::int`,
      })
      .from(partnerPayments)
      .where(and(inArray(partnerPayments.partnerId, ids), eq(partnerPayments.status, "paid")))
      .groupBy(partnerPayments.partnerId, partnerPayments.currency),
  ]);

  const loginBy = new Map<string, PartnerLogin>();
  for (const l of logins) {
    // Oldest first from the query, so the first login seen is the original one.
    if (!l.partnerId || loginBy.has(l.partnerId)) continue;
    loginBy.set(l.partnerId, l);
  }
  const countBy = new Map(counts.filter((c) => c.partnerId).map((c) => [c.partnerId!, c]));
  const revenueBy = new Map<string, Record<string, number>>();
  for (const r of revenue) {
    const bucket = revenueBy.get(r.partnerId) ?? {};
    bucket[r.currency] = (bucket[r.currency] ?? 0) + r.cents;
    revenueBy.set(r.partnerId, bucket);
  }

  const mapped = rows.map(({ partner, coupon }) => ({
    ...partner,
    login: loginBy.get(partner.id) ?? null,
    rate: rateOf(coupon, now),
    students: countBy.get(partner.id)?.students ?? 0,
    paidStudents: countBy.get(partner.id)?.paid ?? 0,
    revenue: revenueBy.get(partner.id) ?? {},
  }));

  return toPage(mapped, total, req);
}

/** One partner, for the admin detail screen. Null when there is no such row. */
/**
 * One partner, for the admin detail screen.
 *
 * Takes the roster's own page request, so the students table there pages,
 * searches and sorts exactly as it does in the partner's own panel — same
 * query, same clamps, one place to fix.
 */
export async function partnerForAdmin(
  partnerId: string,
  req: StudentPageRequest,
  now: Date = new Date(),
) {
  const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId)).limit(1);
  if (!partner) return null;

  const [students, overview, logins, payments] = await Promise.all([
    partnerStudents(partnerId, req, now),
    partnerOverview(partnerId, now),
    partnerLogins(partnerId),
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
        studentUserId: partnerPayments.studentUserId,
        studentName: users.name,
      })
      .from(partnerPayments)
      .leftJoin(users, eq(users.id, partnerPayments.studentUserId))
      .where(eq(partnerPayments.partnerId, partnerId))
      .orderBy(desc(partnerPayments.createdAt))
      .limit(20),
  ]);

  return {
    partner,
    logins,
    students,
    overview,
    // The twenty most recent. The full history lives on /admin/payments, which
    // pages properly; this is the "what happened lately" panel.
    payments: payments.map((r) => ({ ...r, plan: toPlanKey(r.plan) })),
  };
}
/** The partner login rows for an institution, oldest first. */
export async function partnerLogins(partnerId: string): Promise<PartnerLogin[]> {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      lastLoginAt: users.lastLoginAt,
      deactivatedAt: users.deactivatedAt,
    })
    .from(users)
    .where(and(eq(users.partnerId, partnerId), eq(users.role, "partner")))
    .orderBy(users.createdAt);
}

export type CreatePartnerInput = {
  name: string;
  location?: string | null;
  website?: string | null;
  /** Who the credentials belong to — "ILDS Front Desk" is a fine name. */
  loginName: string;
  email: string;
  phone?: string | null;
  password: string;
};

export type CreatePartnerResult =
  | { ok: true; partnerId: string }
  | { ok: false; error: "email_taken" };

/**
 * Onboard an institution: the class, and the one login we hand over with it.
 *
 * BOTH ROWS OR NEITHER. A partner with no login is an institution nobody can
 * sign in as, and it does not show up as missing anywhere — so the
 * duplicate-email failure, which is the likely one, has to take the partner row
 * back out with it rather than leave that behind.
 */
export async function createPartnerWithLogin(
  input: CreatePartnerInput,
): Promise<CreatePartnerResult> {
  const passwordHash = await hashPassword(input.password);
  const email = input.email.trim().toLowerCase();

  try {
    return await db.transaction(async (tx) => {
      const [partner] = await tx
        .insert(partners)
        .values({
          name: input.name,
          location: input.location ?? null,
          website: input.website ?? null,
        })
        .returning({ id: partners.id });

      await tx.insert(users).values({
        name: input.loginName,
        email,
        emailNormalized: email,
        phone: input.phone ?? null,
        passwordHash,
        role: "partner",
        partnerId: partner.id,
      });

      return { ok: true as const, partnerId: partner.id };
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "email_taken" };
    throw err;
  }
}

/** Edit the institution's own details. Its login is changed separately. */
export async function updatePartner(
  partnerId: string,
  patch: { name?: string; location?: string | null; website?: string | null },
): Promise<void> {
  await db
    .update(partners)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(partners.id, partnerId));
}

/**
 * Suspend or restore a partner.
 *
 * Suspending stops new enrolments and new payments; it does NOT touch the
 * students, who keep the access already paid for. See `assertActive`.
 */
export async function setPartnerStatus(
  partnerId: string,
  status: "active" | "suspended",
): Promise<void> {
  await db
    .update(partners)
    .set({ status, updatedAt: new Date() })
    .where(eq(partners.id, partnerId));
}
