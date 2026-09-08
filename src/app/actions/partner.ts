"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { isRazorpayConfigured } from "@/lib/env";
import {
  assertActive,
  enrolStudent,
  ownsStudent,
  partnerContext,
  PartnerSuspendedError,
  setPasswordFor,
} from "@/lib/partners";
import {
  openStudentOrder,
  settleStudentOrder,
  type StudentCheckoutSession,
} from "@/lib/payments/partner-billing";
import { RazorpayApiError, verifyOrderSignature } from "@/lib/payments/razorpay";
import { isOfferedPlan, toBillingCurrency } from "@/lib/plans";
import { rateLimit } from "@/lib/security/rate-limit";
import { enrolStudentSchema } from "@/lib/validation";

/**
 * What a partner can do, and nothing else.
 *
 * A SERVER ACTION IS A PUBLIC ENDPOINT. Every function here re-derives the
 * institution from the session (`partnerContext`) and re-checks that the
 * student it is about belongs to that institution — the panel's forms and
 * buttons are UX, not the gate. A student id in an argument is a claim; the
 * `ownsStudent` check is what makes it true.
 *
 * WRITES ALSO CHECK THE PARTNER IS ACTIVE. A suspended class keeps its roster
 * and its students' results, and can do nothing else.
 */

const SUSPENDED = "This account is suspended. Please get in touch and we'll sort it out.";
const CHECKOUT_UNAVAILABLE =
  "Card payments aren't available right now. Please try again in a few minutes, or contact us and we'll set this up for you.";

export type EnrolResult =
  | { ok: true; studentId: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

/**
 * Enrol a student: create the account, on the free tier, ready to be paid for.
 *
 * NO EMAIL LEAVES THE BUILDING and nothing is verified — the class types the
 * address and hands over the password in the room, which is the whole point of
 * the panel. The account is identical to a self-signed-up one in every other
 * respect, so the student uses the app exactly as anyone else does.
 */
export async function enrolStudentAction(input: unknown): Promise<EnrolResult> {
  const { user, partner } = await partnerContext();
  try {
    assertActive(partner);
  } catch (error) {
    if (error instanceof PartnerSuspendedError) return { ok: false, error: SUSPENDED };
    throw error;
  }

  // A batch of thirty is a normal afternoon; a thousand is a script.
  const limit = await rateLimit(`partner:enrol:${partner.id}`, 100, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, error: "That's a lot of accounts at once. Please try again shortly." };
  }

  const parsed = enrolStudentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const result = await enrolStudent({
    partnerId: partner.id,
    createdByUserId: user.id,
    ...parsed.data,
  });

  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: {
        email: ["Someone already has an account with this email — they can sign in with it."],
      },
    };
  }

  revalidatePath("/partner");
  return { ok: true, studentId: result.studentId };
}

export type StudentCheckoutResult =
  | { ok: true; session: StudentCheckoutSession }
  | { ok: false; error: string };

/**
 * Open a one-time Razorpay order for a student's term, paid on the class's card.
 *
 * THE BROWSER NAMES A TIER AND A CURRENCY, NEVER A PRICE. The tier is re-checked
 * against what is actually on sale, the currency is narrowed to one we have
 * prices for, and the amount is read from src/lib/plans.ts — so the worst a
 * tampered argument achieves is being quoted the other real price.
 */
export async function startStudentCheckout(
  studentId: string,
  plan: string,
  currency?: string,
): Promise<StudentCheckoutResult> {
  const { user, partner, rate } = await partnerContext();
  try {
    assertActive(partner);
  } catch (error) {
    if (error instanceof PartnerSuspendedError) return { ok: false, error: SUSPENDED };
    throw error;
  }

  if (!z.uuid().safeParse(studentId).success) return { ok: false, error: "That request wasn't valid." };
  if (!isOfferedPlan(plan)) return { ok: false, error: "That plan isn't available." };
  if (!(await ownsStudent(partner.id, studentId))) {
    // Not this class's student. Same message either way — a partner must not be
    // able to tell "no such account" from "someone else's".
    return { ok: false, error: "We couldn't find that student." };
  }
  if (!isRazorpayConfigured()) {
    console.error("[partner-billing] startStudentCheckout called with Razorpay unconfigured");
    return { ok: false, error: CHECKOUT_UNAVAILABLE };
  }

  const [student] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, studentId))
    .limit(1);
  if (!student) return { ok: false, error: "We couldn't find that student." };

  try {
    const session = await openStudentOrder({
      partner,
      payer: { id: user.id, name: user.name, email: user.email, phone: user.phone },
      student,
      plan,
      currency: toBillingCurrency(currency),
      // From the session, never the request: see `openStudentOrder`.
      rate,
    });
    return { ok: true, session };
  } catch (error) {
    // Most likely a currency the account is not approved for, or keys that have
    // been rotated. The description says which, so it is logged whole and shown
    // to nobody.
    if (error instanceof RazorpayApiError) {
      console.error(`[partner-billing] Razorpay refused to open an order: ${error.message}`);
      return { ok: false, error: CHECKOUT_UNAVAILABLE };
    }
    throw error;
  }
}

/** What Checkout hands back after a one-off order. */
const callbackSchema = z.object({
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

export type ConfirmStudentResult =
  | { ok: true; plan: string; entitledUntil: string | null }
  | { ok: false; error: string };

/**
 * Verify the signed callback and put the student on the plan their class paid
 * for.
 *
 * THE SIGNATURE IS THE WHOLE GATE on this path: without it, this is an endpoint
 * where any partner can name an order id and have a plan granted. With it, the
 * caller must hold an HMAC over `order_id|payment_id` that only Razorpay and our
 * key secret can produce — and even then `settleStudentOrder` reads the order
 * back from Razorpay before granting anything.
 *
 * THIS IS NOT THE ONLY WAY A TERM IS GRANTED, and not the reliable one: the
 * class may close the tab. The `order.paid` webhook settles the same order
 * independently; whichever arrives first wins and the other is a no-op.
 */
export async function confirmStudentPayment(payload: unknown): Promise<ConfirmStudentResult> {
  const { partner } = await partnerContext();

  const parsed = callbackSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "That payment couldn't be read." };
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  if (
    !verifyOrderSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })
  ) {
    console.error(
      `[partner-billing] rejected an unsigned callback for ${razorpay_order_id} (partner ${partner.id})`,
    );
    return { ok: false, error: "We couldn't verify that payment. Please contact us before paying again." };
  }

  try {
    const result = await settleStudentOrder({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      actor: "user",
      note: `Paid by ${partner.name}`,
    });

    if (!result.ok) {
      console.warn(`[partner-billing] ${razorpay_order_id} not settled: ${result.reason}`);
      return {
        ok: false,
        error:
          result.reason === "not_paid"
            ? "Your payment went through and we're still confirming it. Refresh in a minute."
            : "We couldn't match that payment. Please contact us and we'll sort it out.",
      };
    }

    revalidatePath("/partner");
    revalidatePath(`/partner/students/${result.studentUserId}`);
    return {
      ok: true,
      plan: result.plan,
      entitledUntil: result.entitledUntil?.toISOString() ?? null,
    };
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      console.error(`[partner-billing] could not read back ${razorpay_order_id}: ${error.message}`);
      return {
        ok: false,
        error: "Your payment went through and we're still confirming it. Refresh in a minute.",
      };
    }
    throw error;
  }
}

const resetSchema = z.object({
  studentId: z.uuid(),
  password: z.string().min(6, "Use at least 6 characters").max(128),
});

export type ResetResult = { ok: true } | { ok: false; error: string };

/**
 * Give a student a new password — the "they've forgotten it" button.
 *
 * The class chose the original and holds the account, so this needs no email
 * round trip. Every session of that student is revoked with it (see
 * `setPasswordFor`), which is what makes it a recovery rather than a second key
 * cut for whoever had the first.
 */
export async function resetStudentPassword(input: unknown): Promise<ResetResult> {
  const { partner } = await partnerContext();
  try {
    assertActive(partner);
  } catch (error) {
    if (error instanceof PartnerSuspendedError) return { ok: false, error: SUSPENDED };
    throw error;
  }

  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Use a password of at least 6 characters." };
  const { studentId, password } = parsed.data;

  if (!(await ownsStudent(partner.id, studentId))) {
    return { ok: false, error: "We couldn't find that student." };
  }

  await setPasswordFor(studentId, password);
  revalidatePath(`/partner/students/${studentId}`);
  return { ok: true };
}
