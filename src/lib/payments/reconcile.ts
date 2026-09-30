import "server-only";

import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, transactions } from "@/db/schema";
import { fetchInvoice, listPayments, type RazorpayPayment } from "./razorpay";

/**
 * Did every payment Razorpay captured yesterday reach the ledger?
 *
 * WHY. A captured payment with no `transactions` row is a customer who paid and
 * may not have the plan they paid for — every webhook for it failed, or was
 * never sent, and the browser callback never came back. Nothing else notices:
 * the ledger only knows what it was told. This asks Razorpay what actually
 * happened and looks for each payment in our books.
 *
 * HOW A PAYMENT IS FOUND, most specific first:
 *   1. by its `pay_…` id — set on partner orders and on `subscription.charged`;
 *   2. by its order — a partner sale is keyed `razorpay:order:<order_id>`;
 *   3. by its subscription — a direct sale is keyed on the billing cycle and
 *      often has no payment id at all (see the schema), so the invoice names
 *      the subscription and any ledger row for it within a few days counts.
 *
 * READ-ONLY. It reports; it never writes a row. Fixing a missed sale is a
 * decision for a human with the dashboard open.
 */

/** How far either side of the charge a direct sale's ledger row may be. */
const MATCH_WINDOW_MS = 3 * 86_400_000;

export type Unmatched = Pick<RazorpayPayment, "id" | "amount" | "currency" | "order_id"> & {
  subscriptionId: string | null;
};

export type Reconciliation = { captured: number; matched: number; unmatched: Unmatched[] };

export async function reconcilePayments(from: Date, to: Date): Promise<Reconciliation> {
  const captured = (await listPayments(from, to)).filter((p) => p.status === "captured");
  if (captured.length === 0) return { captured: 0, matched: 0, unmatched: [] };

  const byPaymentId = new Set(
    (
      await db
        .select({ id: transactions.providerPaymentId })
        .from(transactions)
        .where(inArray(transactions.providerPaymentId, captured.map((p) => p.id)))
    ).map((r) => r.id),
  );
  const orderKeys = captured.filter((p) => p.order_id).map((p) => `razorpay:order:${p.order_id}`);
  const byOrderKey = new Set(
    orderKeys.length
      ? (
          await db
            .select({ key: transactions.idempotencyKey })
            .from(transactions)
            .where(inArray(transactions.idempotencyKey, orderKeys))
        ).map((r) => r.key)
      : [],
  );

  const unmatched: Unmatched[] = [];
  for (const p of captured) {
    if (byPaymentId.has(p.id)) continue;
    if (p.order_id && byOrderKey.has(`razorpay:order:${p.order_id}`)) continue;

    const subscriptionId = p.invoice_id ? ((await fetchInvoice(p.invoice_id)).subscription_id ?? null) : null;
    if (subscriptionId && (await ledgerHasCycle(subscriptionId, new Date(p.created_at * 1000)))) continue;

    unmatched.push({ id: p.id, amount: p.amount, currency: p.currency, order_id: p.order_id, subscriptionId });
  }
  return { captured: captured.length, matched: captured.length - unmatched.length, unmatched };
}

async function ledgerHasCycle(providerSubscriptionId: string, chargedAt: Date): Promise<boolean> {
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .innerJoin(subscriptions, eq(subscriptions.id, transactions.subscriptionId))
    .where(
      and(
        eq(subscriptions.providerSubscriptionId, providerSubscriptionId),
        gte(transactions.createdAt, new Date(chargedAt.getTime() - MATCH_WINDOW_MS)),
        lt(transactions.createdAt, new Date(chargedAt.getTime() + MATCH_WINDOW_MS)),
      ),
    )
    .limit(1);
  return rows.length > 0;
}
