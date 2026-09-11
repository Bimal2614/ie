import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { partnerPayments, users } from "@/db/schema";
import { env } from "@/lib/env";
import { quoteFor, type PartnerRate } from "@/lib/partner-pricing";
import { PLANS, type BillingCurrency, type OfferedPlan, type PlanKey } from "@/lib/plans";
import { createOrder, fetchOrder } from "@/lib/payments/razorpay";
import { recordCharge } from "@/lib/payments/transactions";
import { toE164 } from "@/lib/phone";
import { grantPlan, periodEndFor } from "@/lib/subscriptions";
import type { Partner } from "@/db/schema";

/**
 * A partner paying for one of its students.
 *
 * DELIBERATELY NOT src/lib/payments/billing.ts, and deliberately not a
 * subscription. A candidate buying their own plan authorises a MANDATE that
 * Razorpay then debits every cycle; a class buying a term for a student pays
 * ONCE, for that term, and buys the next one when the student is still there.
 * Both facts follow from who is paying:
 *
 *   - A batch churns. An auto-renewing mandate per student charges the class
 *     for people who left, and stopping thirty of them is thirty cancellations.
 *   - In India each e-mandate needs its own authorisation and a pre-debit
 *     notice before every charge. Thirty students is thirty of each.
 *   - The mandate would be attached to a Razorpay customer built from the
 *     STUDENT's identity while the card belongs to the class — a mismatch that
 *     only surfaces at the worst moment, in a dispute.
 *
 * So this file speaks Orders. Everything it grants goes through `grantPlan`,
 * the same single writer the candidate checkout uses, tagged
 * `provider: "partner"` so a paid seat is never mistaken for a free admin grant
 * and never handed to the subscriptions API by a cancel button.
 */

export type StudentCheckoutSession = {
  /** Razorpay's `order_…`, which Checkout is opened against. */
  orderId: string;
  /** The PUBLIC key. The secret never reaches the browser. */
  keyId: string;
  amount: number;
  currency: string;
  planLabel: string;
  description: string;
  studentName: string;
  /** List price, for the "was ₹1,299" the confirmation shows. */
  listAmount: number;
  discountPercent: number;
  /** The PAYER — the class, not the student. It is their card. */
  prefill: { name: string; email: string; contact: string };
};

/**
 * Create the order Checkout will collect against, and record the intent.
 *
 * NOTHING IS CHARGED HERE and no plan is granted: the row that comes back is in
 * Razorpay's `created` state, which is an invitation to pay. The
 * `partner_payments` row is written in the same state, so a checkout the class
 * abandons leaves a visible "started, not completed" rather than nothing at all.
 *
 * THE AMOUNT COMES FROM src/lib/plans.ts, never from the caller. The panel
 * names a tier and a currency; what that costs is not the browser's to say.
 */
export async function openStudentOrder(input: {
  partner: Partner;
  /** The partner login pressing the button — the payer, and the audit trail. */
  payer: { id: string; name: string; email: string; phone: string | null };
  student: { id: string; name: string; email: string };
  plan: OfferedPlan;
  currency: BillingCurrency;
  /**
   * The partner's rate, resolved from the SESSION by `partnerContext` — never
   * from anything the browser sent. A discount named by the caller would be a
   * discount anyone could name.
   */
  rate: PartnerRate;
}): Promise<StudentCheckoutSession> {
  const entitlements = PLANS[input.plan];
  // One quote, used for the order, the record and the copy. The class cannot
  // be shown one price and charged another because there is only one number.
  const quote = quoteFor(input.plan, input.currency, input.rate);
  const amountCents = quote.payableCents;

  const order = await createOrder({
    amountCents,
    currency: input.currency,
    // Razorpay shows this in its dashboard and caps it at 40 characters, so it
    // carries the two ids a reconciliation actually starts from, shortened.
    receipt: `sd-${input.student.id.slice(0, 8)}-${Date.now().toString(36)}`,
    // Echoed back on every event this order raises. The webhook reads the
    // student, the class and the tier out of here — it has nothing else to go
    // on, and by then no browser is open to ask.
    notes: {
      kind: "partner_seat",
      partnerId: input.partner.id,
      studentUserId: input.student.id,
      planKey: input.plan,
      currency: input.currency,
      createdByUserId: input.payer.id,
      // Razorpay notes are strings; these are for a human reading the dashboard.
      ...(quote.percent > 0 ? { discountPercent: String(quote.percent), coupon: quote.code ?? "" } : {}),
    },
  });

  await db.insert(partnerPayments).values({
    partnerId: input.partner.id,
    studentUserId: input.student.id,
    createdByUserId: input.payer.id,
    plan: input.plan,
    amountCents,
    // What it would have cost, and the rate applied — copied here rather than
    // looked up through the partner later, so re-rating the class next quarter
    // cannot rewrite this invoice.
    listPriceCents: quote.listCents,
    discountPercent: quote.percent > 0 ? quote.percent : null,
    currency: input.currency,
    status: "created",
    razorpayOrderId: order.id,
  });

  return {
    orderId: order.id,
    keyId: env.RAZORPAY_KEY_ID!,
    amount: amountCents,
    currency: input.currency,
    planLabel: entitlements.label,
    description: `${entitlements.label} for ${input.student.name} — ${entitlements.billingMonths} month(s)`,
    studentName: input.student.name,
    listAmount: quote.listCents,
    discountPercent: quote.percent,
    prefill: {
      name: input.payer.name,
      email: input.payer.email,
      /*
       * E.164, not the stored shape. Phone numbers are kept here as
       * `+91-9876543210` — readable, and what the country <select> round-trips
       * — but Razorpay Checkout silently DROPS a contact it cannot parse, so
       * the hyphen costs the payer a re-typed mobile number at the one moment
       * they are trying to pay.
       */
      contact: toE164(input.payer.phone) ?? "",
    },
  };
}

export type SettleResult =
  | {
      ok: true;
      plan: Exclude<PlanKey, "free">;
      studentUserId: string;
      entitledUntil: Date | null;
      /** True when someone else had already granted this term. */
      alreadyDone: boolean;
    }
  | { ok: false; reason: "unknown_order" | "no_student" | "not_paid" };

/**
 * Turn a paid order into a term of access for the student.
 *
 * TWO CALLERS RACE EACH OTHER HERE, on purpose: the browser calls this the
 * moment Checkout returns, so the panel can say "done" without waiting, and the
 * `order.paid` webhook calls it independently, so a class that closes the tab
 * still gets what it paid for. Either can also arrive twice.
 *
 * THE RACE IS SETTLED BY ONE CONDITIONAL UPDATE. Both readers see `created` and
 * both try to move the row to `paid` — but that UPDATE names the old status, so
 * exactly one of them gets a row back and only that one grants anything. The
 * loser reports success without writing, which is the truth: the term exists.
 *
 * WHAT RAZORPAY SAYS IS WHAT COUNTS. The signature the browser carries proves
 * someone holds a valid callback; it does not prove money moved. `fetchOrder`
 * is what proves that, and it is checked on both paths — the webhook's word is
 * not taken for it either.
 */
export async function settleStudentOrder(input: {
  orderId: string;
  paymentId: string | null;
  actor: "user" | "webhook";
  note?: string;
}): Promise<SettleResult> {
  const [row] = await db
    .select()
    .from(partnerPayments)
    .where(eq(partnerPayments.razorpayOrderId, input.orderId))
    .limit(1);

  // An order this app did not open. A webhook for someone else's integration,
  // or a crafted callback: either way there is nothing here to grant.
  if (!row) return { ok: false, reason: "unknown_order" };
  if (!row.studentUserId) return { ok: false, reason: "no_student" };

  const studentUserId = row.studentUserId;
  const plan = row.plan as Exclude<PlanKey, "free">;

  if (row.status === "paid") {
    const [student] = await db
      .select({ planExpiresAt: users.planExpiresAt })
      .from(users)
      .where(eq(users.id, studentUserId))
      .limit(1);
    return {
      ok: true,
      plan,
      studentUserId,
      entitledUntil: student?.planExpiresAt ?? null,
      alreadyDone: true,
    };
  }

  const order = await fetchOrder(input.orderId);
  // `amount_paid`, not `status`: an order goes to `attempted` the moment a card
  // is tried, and a partially captured order is not a paid one.
  if (order.status !== "paid" || order.amount_paid < row.amountCents) {
    return { ok: false, reason: "not_paid" };
  }

  const now = new Date();
  const [claimed] = await db
    .update(partnerPayments)
    .set({
      status: "paid",
      paidAt: now,
      razorpayPaymentId: input.paymentId ?? row.razorpayPaymentId,
      updatedAt: now,
    })
    .where(and(eq(partnerPayments.id, row.id), eq(partnerPayments.status, "created")))
    .returning({ id: partnerPayments.id });

  if (!claimed) {
    // The other caller won between our read and our write. It is granting the
    // term right now, or has already; re-read rather than granting a second one.
    return settleStudentOrder(input);
  }

  /*
   * WHERE THE NEW TERM STARTS — the difference between renewing and losing time.
   *
   * `grantPlan` defaults a period to "the plan's term from today", which is
   * right for a first purchase and WRONG for an extension: a class renewing a
   * student on the 25th of a month that runs to the 1st would pay for a month
   * and receive six days fewer, silently, every time they renewed early. So a
   * renewal of the SAME tier stacks onto the end of the window already paid for.
   *
   * A different tier does not stack. Buying Premium for someone on Pro takes
   * effect now — that is an upgrade, and making it queue behind the old plan
   * would sell them something they cannot use yet.
   */
  const [student] = await db
    .select({ plan: users.plan, planExpiresAt: users.planExpiresAt })
    .from(users)
    .where(eq(users.id, studentUserId))
    .limit(1);

  const stillRunning = Boolean(
    student && student.plan === plan && (!student.planExpiresAt || student.planExpiresAt > now),
  );
  const periodEnd = !stillRunning
    ? undefined // let grantPlan use the plan's own term from today
    : student?.planExpiresAt
      ? periodEndFor(student.planExpiresAt, PLANS[plan].billingMonths)
      : // Already on this tier with no expiry — an open-ended admin grant. Paying
        // for a term must not put an end date on an account that had none.
        null;

  let subscriptionId: string;
  let entitledUntil: Date | null;
  try {
    const sub = await grantPlan({
      userId: studentUserId,
      plan,
      periodEnd,
      priceCents: row.amountCents,
      currency: row.currency,
      provider: "partner",
      /*
       * `partner`, never `admin`. An admin actor reads as COMPED everywhere
       * downstream — the daily report drops those from revenue — and a class
       * that just paid ₹1,299 is not a comp.
       */
      actor: input.actor === "webhook" ? "webhook" : "partner",
      actorUserId: row.createdByUserId,
      note: input.note ?? "Paid by the student's IELTS class",
      metadata: {
        partnerId: row.partnerId,
        partnerPaymentId: row.id,
        razorpayOrderId: row.razorpayOrderId,
        razorpayPaymentId: input.paymentId,
      },
    });
    subscriptionId = sub.id;
    entitledUntil = sub.currentPeriodEnd;

    /*
     * The money, once the term is actually granted.
     *
     * Keyed on the ORDER, which is one-time and already unique in
     * `partner_payments` — so the browser callback and `order.paid` racing each
     * other produce one row, exactly as they produce one term.
     */
    await recordCharge({
      idempotencyKey: `razorpay:order:${row.razorpayOrderId}`,
      amountCents: row.amountCents,
      currency: row.currency,
      provider: "partner",
      userId: studentUserId,
      partnerId: row.partnerId,
      subscriptionId: sub.id,
      partnerPaymentId: row.id,
      providerPaymentId: input.paymentId ?? row.razorpayPaymentId ?? null,
      /*
       * The same shape the direct charge writes: the tier, the window it
       * bought, and the order it settled. `stillRunning` is what separates a
       * renewal stacked onto an existing term from a fresh one, and that is
       * exactly the distinction somebody reconciling this row will ask about.
       */
      note:
        `${PLANS[plan].label} seat · ${stillRunning ? "extended to" : "through"} ` +
        `${sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString().slice(0, 10) : "open"}` +
        ` · order ${row.razorpayOrderId}`,
    });
  } catch (error) {
    // Release the claim, exactly as the webhook route releases its own on a
    // failure: a claim that outlives the failure suppresses the retry that was
    // meant to fix it, and leaves a class charged for nothing.
    await db
      .update(partnerPayments)
      .set({ status: "created", paidAt: null, updatedAt: new Date() })
      .where(eq(partnerPayments.id, row.id));
    throw error;
  }

  await db
    .update(partnerPayments)
    .set({ subscriptionId, updatedAt: new Date() })
    .where(eq(partnerPayments.id, row.id));

  return { ok: true, plan, studentUserId, entitledUntil, alreadyDone: false };
}

/**
 * Record that a payment attempt failed, and say whether the order was one of
 * ours at all.
 *
 * Nothing is granted and nothing is taken away — the row is only marked so the
 * panel can say so, and the class's next attempt opens a fresh order rather
 * than reviving this one. The boolean is what lets the webhook tell a partner's
 * failed order apart from a candidate's failed mandate, which is handled
 * completely differently.
 *
 * Only a `created` row is touched: a failure arriving after the money was
 * captured must never unpick a term that has already been granted.
 */
export async function markStudentOrderFailed(orderId: string): Promise<boolean> {
  const [row] = await db
    .update(partnerPayments)
    .set({ status: "failed", updatedAt: new Date() })
    .where(and(eq(partnerPayments.razorpayOrderId, orderId), eq(partnerPayments.status, "created")))
    .returning({ id: partnerPayments.id });
  return Boolean(row);
}
