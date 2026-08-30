"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, auditLog } from "@/db/schema";
import { requireAdmin } from "@/lib/dal";
import { PLANS, type PlanKey } from "@/lib/plans";
import { grantPlan, revokePlan, subscriptionHistory, billingLog } from "@/lib/subscriptions";

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

/** Put an account on a paid plan for one month (or until `periodEnd`). */
export async function adminGrantPlan(input: {
  userId: string;
  plan: Exclude<PlanKey, "free">;
  /** ISO date. Omit for one month from now; `null` for an account that never lapses. */
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
    // does not rewrite what this account was put on.
    priceCents: PLANS[input.plan].priceCents,
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
