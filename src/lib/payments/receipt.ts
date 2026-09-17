import "server-only";

import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { partnerPayments, partners, subscriptions, users } from "@/db/schema";
import { OPERATOR } from "@/lib/legal-content";
import { PLANS, toPlanKey } from "@/lib/plans";
import { renderReceiptPdf, winAnsi, type Receipt, type ReceiptLine } from "@/lib/payments/receipt-pdf";

/**
 * Proof that an institution paid for a student's term.
 *
 * WHAT MAKES A RECEIPT EXIST: a `partner_payments` row in `paid`. Not an order,
 * not an attempt — an order sits in `created` from the moment Checkout opens,
 * and handing someone a receipt for one would be handing them a document
 * saying we took money we have not taken. `partnerReceipt` filters on the
 * status for that reason, and the UI only offers the link for rows that have it.
 *
 * THE `partnerId` ARGUMENT IS THE ACCESS CHECK, exactly as in lib/partners.ts:
 * it comes from the session, and a payment that is not this institution's
 * returns null — indistinguishable from one that does not exist, so a guessed
 * uuid cannot even confirm which payments are real.
 *
 * NOTHING HERE IS LOOKED UP THROUGH THE PARTNER. The tier, the price, the list
 * price and the discount are all read off the payment row, which froze them at
 * the sale (see the column comments in db/schema.ts). Re-rating a class next
 * quarter, or retiring its coupon, must not silently rewrite a receipt that has
 * already been downloaded, filed and reconciled.
 */

/** The payer's login, joined alongside the student's — two rows from `users`. */
const payer = alias(users, "payer");

/**
 * A receipt number that is stable without a new column.
 *
 * `IV-2609-3F7A2B`: the month it was paid, then six hex digits of the payment's
 * own uuid. Deriving it means the same payment yields the same reference every
 * time it is downloaded — which is the only property that actually matters when
 * an institution quotes it back to us in an email — with no counter to keep, no
 * migration, and no way for two rows to collide, since the uuid already cannot.
 *
 * It is deliberately NOT a sequential tax-invoice number. We are not registered
 * for GST (`OPERATOR.gstin` is null), so there is no series to be part of; the
 * day that changes, this is where the real numbering goes.
 */
export function receiptNumber(paymentId: string, paidAt: Date): string {
  const yy = String(paidAt.getUTCFullYear()).slice(2);
  const mm = String(paidAt.getUTCMonth() + 1).padStart(2, "0");
  return `IV-${yy}${mm}-${paymentId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** `IELTSVega-receipt-IV-2609-3F7A2B.pdf`, safe for a Content-Disposition. */
export function receiptFileName(number: string): string {
  return `IELTSVega-receipt-${number.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}

/**
 * The receipt for one of this institution's paid seats, or null.
 *
 * One query. The payment carries every figure; the joins only supply names —
 * who paid, who it was for, and how long the term it opened runs. All three are
 * LEFT joins because `partner_payments` outlives the accounts it names (both
 * user columns are SET NULL on delete), and a receipt for a student who has
 * since been removed must still render rather than 404.
 */
export async function partnerReceipt(
  partnerId: string,
  paymentId: string,
): Promise<Receipt | null> {
  const [row] = await db
    .select({
      id: partnerPayments.id,
      plan: partnerPayments.plan,
      amountCents: partnerPayments.amountCents,
      listPriceCents: partnerPayments.listPriceCents,
      discountPercent: partnerPayments.discountPercent,
      currency: partnerPayments.currency,
      razorpayOrderId: partnerPayments.razorpayOrderId,
      razorpayPaymentId: partnerPayments.razorpayPaymentId,
      paidAt: partnerPayments.paidAt,
      createdAt: partnerPayments.createdAt,
      partnerName: partners.name,
      partnerLocation: partners.location,
      studentName: users.name,
      studentEmail: users.email,
      payerName: payer.name,
      payerEmail: payer.email,
      accessUntil: subscriptions.currentPeriodEnd,
    })
    .from(partnerPayments)
    .innerJoin(partners, eq(partners.id, partnerPayments.partnerId))
    .leftJoin(users, eq(users.id, partnerPayments.studentUserId))
    .leftJoin(payer, eq(payer.id, partnerPayments.createdByUserId))
    .leftJoin(subscriptions, eq(subscriptions.id, partnerPayments.subscriptionId))
    .where(
      and(
        eq(partnerPayments.id, paymentId),
        eq(partnerPayments.partnerId, partnerId),
        // See the header: only a settled payment has a receipt.
        eq(partnerPayments.status, "paid"),
      ),
    )
    .limit(1);

  if (!row) return null;

  const plan = PLANS[toPlanKey(row.plan)];
  // `paid_at` is written in the same UPDATE that claims the row, so it is set
  // on every row this query can return. The fallback covers the one case where
  // it is not — a row repaired by hand — because a date beats no date.
  const paidAt = row.paidAt ?? row.createdAt;
  const number = receiptNumber(row.id, paidAt);

  const months = plan.billingMonths;
  const term = months > 0 ? `${plan.label} plan · ${months} month${months === 1 ? "" : "s"}` : plan.label;

  /*
   * The discount is shown as its own line rather than folded into the price.
   * An institution reconciling this against its own books needs to see what the
   * seat lists at and what its rate took off — a single net figure makes the
   * two numbers in our emails and on our pricing page look like a mistake.
   */
  const lines: ReceiptLine[] = [];
  const listCents = row.listPriceCents ?? row.amountCents;
  if (listCents > row.amountCents) {
    lines.push({ label: term, amountCents: listCents });
    lines.push({
      label: row.discountPercent
        ? `Institute rate (${row.discountPercent}% off)`
        : "Institute rate",
      amountCents: row.amountCents - listCents,
    });
  } else {
    lines.push({ label: term, amountCents: row.amountCents });
  }

  return {
    number,
    paidAt,
    seller: {
      // The registered entity once there is one, the trading name until then —
      // the same rule the published legal documents follow.
      name: OPERATOR.legalName ?? "IELTSVega",
      email: OPERATOR.email,
      site: OPERATOR.site,
      cin: OPERATOR.cin,
      gstin: OPERATOR.gstin,
    },
    billedTo: {
      name: row.partnerName,
      location: row.partnerLocation,
      payerName: row.payerName,
      payerEmail: row.payerEmail,
    },
    student: {
      name: row.studentName ?? "Student removed",
      email: row.studentEmail ?? "",
    },
    item: { planLabel: plan.label, months, accessUntil: row.accessUntil },
    currency: row.currency,
    lines,
    totalCents: row.amountCents,
    orderId: row.razorpayOrderId,
    paymentId: row.razorpayPaymentId,
  };
}

/** The bytes and the filename together, so the route has one thing to do. */
export async function partnerReceiptPdf(
  partnerId: string,
  paymentId: string,
): Promise<{ bytes: Uint8Array; fileName: string; number: string } | null> {
  const receipt = await partnerReceipt(partnerId, paymentId);
  if (!receipt) return null;
  return {
    bytes: await renderReceiptPdf(receipt),
    fileName: receiptFileName(receipt.number),
    number: winAnsi(receipt.number),
  };
}
