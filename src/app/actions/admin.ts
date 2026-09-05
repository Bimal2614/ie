"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, auditLog } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { DEFAULT_OFFERED_PLAN, isOfferedPlan, priceFor, type PlanKey } from "@/lib/plans";
import {
  grantPlan,
  revokePlan,
  periodEndFor,
  subscriptionHistory,
  billingLog,
} from "@/lib/subscriptions";

/**
 * Reactivate an account that was disabled (e.g. by automatic rate-limit
 * deactivation). Admin-only. Clears the deactivation flag; the user can sign in
 * again and old rate-limit violation counters expire on their own window.
 */
export async function reactivateAccount(userId: string): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();

  await db
    .update(users)
    .set({ deactivatedAt: null, deactivationReason: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await db.insert(auditLog).values({
    userId,
    event: "account.reactivated",
    metadata: { by: admin.id },
  });

  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Plans
 *
 * There is no payment gateway yet, so these are how a subscription starts and
 * stops. They are thin on purpose: every table write happens in
 * src/lib/subscriptions.ts, which keeps `subscriptions`, `users.plan` and the
 * ledger in step inside one transaction. An admin route that touched
 * `users.plan` directly is exactly the drift that file exists to prevent.
 * ------------------------------------------------------------------ */

/** Put an account on a paid plan for the tier's own term (or until `periodEnd`). */
export async function adminGrantPlan(input: {
  userId: string;
  plan: Exclude<PlanKey, "free">;
  /** ISO date. Omit for the plan's own term; `null` for an account that never lapses. */
  periodEnd?: string | null;
  note?: string;
}): Promise<{ ok: boolean; expiresAt: string | null }> {
  const admin = await requireAdmin();

  const sub = await grantPlan({
    userId: input.userId,
    plan: input.plan,
    periodEnd:
      input.periodEnd === undefined ? undefined : input.periodEnd === null ? null : new Date(input.periodEnd),
    // What the tier costs today, recorded with the grant so a later price change
    // does not rewrite what this account was put on. Rupees: an admin grant is
    // made from the dashboard here, not from a candidate's checkout, so it is
    // priced in the base currency whoever it is granted to.
    priceCents: priceFor(input.plan),
    actor: "admin",
    actorUserId: admin.id,
    note: input.note ?? `Granted by admin`,
  });

  return { ok: true, expiresAt: sub.currentPeriodEnd?.toISOString() ?? null };
}

/** End a subscription now and drop the account to free (refund, abuse, mistake). */
export async function adminRevokePlan(userId: string, reason?: string): Promise<{ ok: boolean }> {
  const admin = await requireAdmin();

  const { revoked } = await revokePlan(userId, {
    reason: reason ?? null,
    actor: "admin",
    actorUserId: admin.id,
  });

  return { ok: revoked };
}

/** One account's subscriptions and its billing ledger, for a support screen. */
export async function adminBillingFor(userId: string) {
  await requireAdmin();
  const [subs, log] = await Promise.all([subscriptionHistory(userId), billingLog(userId)]);
  return { subscriptions: subs, log };
}

/* ------------------------------------------------------------------ *
 * /verify-students
 *
 * The stand-in for a payment gateway. Until checkout exists, a candidate who
 * has paid for a class is put on a plan by hand from that screen, and these
 * two actions are what the buttons call.
 *
 * They are `adminGrantPlan`/`adminRevokePlan` with three differences that
 * matter for that screen: the input is re-validated here because a Server
 * Action is a public endpoint (the <select>s are UX, not the gate), nothing is
 * charged — `priceCents: null`, since whatever the student paid changed hands
 * off-platform and recording the list price would put revenue in the ledger
 * that was never collected — and the page is revalidated so the row moves
 * between the two tabs without a reload.
 * ------------------------------------------------------------------ */

const verifySchema = z.object({
  userId: z.uuid(),
  /**
   * Omitted by the screen, which offers one tier. Validated against what is on
   * sale rather than against the database enum, so a crafted POST cannot put a
   * student on a tier the business has withdrawn.
   */
  plan: z
    .enum(["pro", "premium"])
    .default(DEFAULT_OFFERED_PLAN)
    .refine(isOfferedPlan, "That plan is not on sale."),
  /** 0 means "never lapses"; anything else is that many months from now. */
  months: z.number().int().min(0).max(24),
});

export type VerifyStudentInput = z.input<typeof verifySchema>;
export type AdminActionResult =
  | { ok: true; expiresAt: string | null }
  | { ok: false; error: string };

/** Put a student on a paid plan because a human confirmed they should be on it. */
export async function verifyStudent(input: VerifyStudentInput): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That request wasn't valid." };
  const { userId, plan, months } = parsed.data;

  const [target] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) return { ok: false, error: "That account no longer exists." };
  // Admins already bypass the plan gates; granting one a subscription would
  // only put a purchase in the ledger that buys nothing.
  if (target.role === "admin") return { ok: false, error: "Admin accounts don't need verifying." };

  const sub = await grantPlan({
    userId,
    plan,
    periodEnd: months === 0 ? null : periodEndFor(new Date(), months),
    priceCents: null,
    actor: "admin",
    actorUserId: admin.id,
    note: `Verified by ${admin.email} — manual grant, no payment gateway yet`,
    metadata: { via: "verify-students", months },
  });

  revalidatePath("/verify-students");
  return { ok: true, expiresAt: sub.currentPeriodEnd?.toISOString() ?? null };
}

/** Undo a verification: end the plan now and drop the account back to free. */
export async function unverifyStudent(userId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(userId).success) return { ok: false, error: "That request wasn't valid." };

  await revokePlan(userId, {
    reason: `Verification removed by ${admin.email}`,
    actor: "admin",
    actorUserId: admin.id,
  });

  revalidatePath("/verify-students");
  return { ok: true, expiresAt: null };
}
