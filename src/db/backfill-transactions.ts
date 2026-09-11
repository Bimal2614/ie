/**
 * Populate `transactions` from the money that has already moved.
 *
 * A ONE-OFF, deliberately kept out of package.json: an npm alias makes a
 * migration-shaped tool look like a routine command, and this one writes money
 * rows. Run it by hand, on purpose:
 *
 *   npx tsx src/db/backfill-transactions.ts                       # local, DRY RUN
 *   npx tsx src/db/backfill-transactions.ts --apply               # local, writes
 *   npx tsx src/db/backfill-transactions.ts --staging             # staging, DRY RUN
 *   npx tsx src/db/backfill-transactions.ts --staging --apply     # staging, writes
 *   npx tsx src/db/backfill-transactions.ts --staging --refresh-notes --apply
 *
 * DRY RUN IS THE DEFAULT, and `--staging` must be asked for by name. Nothing is
 * written without `--apply`.
 *
 * Already run against staging on 2026-09-11 (22 rows, notes filled). Local has
 * no money to import.
 *
 * WHAT IT DERIVES, and from where:
 *
 *   A. PARTNER SALES — `partner_payments` where `status = 'paid'`. One order is
 *      one payment is one transaction; `razorpay_order_id` is already unique
 *      there, so there is nothing to collapse.
 *
 *   B. DIRECT SALES — priced `subscription_logs` rows against a `razorpay`
 *      subscription, GROUPED BY (subscription, effective_at). That grouping is
 *      the whole point: one charge appears in that table up to three times,
 *      because the signed browser callback, `subscription.activated` and
 *      `subscription.charged` each append their own row. They agree on the
 *      CYCLE, so the cycle is what collapses them.
 *
 * WHAT IT SKIPS, all deliberately:
 *   - `payment_failed` rows — a declined card carries an amount and moved no money;
 *   - `manual` subscriptions — admin comps, which have no price at all;
 *   - partner orders still `created` or `failed` — an abandoned or dead checkout.
 *
 * THE KEYS MATCH THE LIVE WRITER. `recordCharge` builds
 * `razorpay:sub:<id>:<cycle start ISO>` and `razorpay:order:<order id>`, and so
 * does this script — so a webhook that arrives later for a cycle already
 * backfilled collides on the unique index and is dropped, rather than being
 * counted a second time. That is also what makes re-running this safe.
 *
 * `created_at` is written EXPLICITLY, never left to `defaultNow()`: for a
 * direct charge it is the earliest delivery we saw (closest to when the money
 * actually moved), for a partner order it is `paid_at`. Months bucket by this
 * column, so letting it default would file every historical sale under today.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

import * as schema from "./schema";
import { transactions } from "./schema";

type Row = typeof transactions.$inferInsert & { deliveries?: number };

const money = (cents: number, currency: string) =>
  `${currency === "USD" ? "$" : "₹"}${(cents / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function totals(rows: Row[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.currency] = (out[r.currency] ?? 0) + r.amountCents;
  return out;
}

function show(label: string, byCurrency: Record<string, number>) {
  const parts = Object.entries(byCurrency).map(([c, cents]) => money(cents, c));
  console.log(`  ${label.padEnd(34)} ${parts.length ? parts.join("  +  ") : "—"}`);
}

async function main() {
  const args = process.argv.slice(2);
  const staging = args.includes("--staging");
  const apply = args.includes("--apply");
  /**
   * Fill in notes on rows that are already here — for a ledger backfilled
   * before the writers began describing their own rows.
   *
   * ONLY WHERE THE NOTE IS EMPTY, deliberately. A row written live carries
   * "· charge 2 of 12", which cannot be reconstructed from a log row, so
   * overwriting would quietly make an existing row say less than it did.
   */
  const refreshNotes = args.includes("--refresh-notes");

  const url = staging ? process.env.STAGING_DATABASE_URL : process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      `${staging ? "STAGING_DATABASE_URL" : "DATABASE_URL"} is not set (check .env.local)`,
    );
  }

  const client = postgres(url, { max: 1, ssl: staging ? "require" : undefined });
  const db = drizzle(client, { schema, casing: "snake_case" });

  console.log(`\n  target   ${staging ? "STAGING" : "local"}`);
  console.log(`  mode     ${apply ? "APPLY — rows will be written" : "dry run"}\n`);

  try {
    // Neon's pooler can hand back a session with no search_path, which makes
    // every unqualified table name a 42P01. Setting it costs nothing locally.
    await db.execute(sql`SET search_path TO public`);

    /* ---------------- A. partner sales ---------------- */

    const partnerRows = (await db.execute(sql`
      SELECT
        p.id::text                AS partner_payment_id,
        p.partner_id::text        AS partner_id,
        p.student_user_id::text   AS student_user_id,
        p.subscription_id::text   AS subscription_id,
        p.amount_cents,
        p.currency,
        p.razorpay_order_id,
        p.razorpay_payment_id,
        initcap(p.plan::text) || ' seat · order ' || p.razorpay_order_id AS note,
        coalesce(p.paid_at, p.created_at) AS occurred_at
      FROM partner_payments p
      WHERE p.status = 'paid'
      ORDER BY occurred_at
    `)) as unknown as Array<{
      partner_payment_id: string;
      partner_id: string;
      student_user_id: string | null;
      subscription_id: string | null;
      amount_cents: number;
      currency: string;
      razorpay_order_id: string;
      razorpay_payment_id: string | null;
      note: string;
      occurred_at: Date;
    }>;

    const fromPartners: Row[] = partnerRows.map((r) => ({
      direction: "C" as const,
      amountCents: Number(r.amount_cents),
      currency: r.currency,
      idempotencyKey: `razorpay:order:${r.razorpay_order_id}`,
      provider: "partner" as const,
      userId: r.student_user_id,
      partnerId: r.partner_id,
      subscriptionId: r.subscription_id,
      partnerPaymentId: r.partner_payment_id,
      providerPaymentId: r.razorpay_payment_id,
      note: r.note,
      createdAt: new Date(r.occurred_at),
    }));

    /* ---------------- B. direct sales ---------------- */

    const directRows = (await db.execute(sql`
      SELECT
        s.provider_subscription_id        AS sub_id,
        l.effective_at,
        min(l.created_at)                 AS occurred_at,
        max(l.amount_cents)               AS amount_cents,
        min(l.amount_cents)               AS amount_cents_min,
        max(l.currency)                   AS currency,
        max(l.subscription_id::text)      AS subscription_id,
        max(l.user_id::text)              AS user_id,
        max(l.metadata->>'razorpayPaymentId') AS pay_id,
        initcap(s.plan::text) || ' subscription · '
          || to_char(l.effective_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') || ' → '
          || coalesce(to_char(max(l.expires_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD'), 'open')
                                          AS note,
        count(*)::int                     AS deliveries
      FROM subscription_logs l
      JOIN subscriptions s ON s.id = l.subscription_id
      WHERE l.amount_cents IS NOT NULL
        AND l.event <> 'payment_failed'
        AND s.provider = 'razorpay'
        AND s.provider_subscription_id IS NOT NULL
        AND l.effective_at IS NOT NULL
      GROUP BY 1, 2, s.plan
      ORDER BY 3
    `)) as unknown as Array<{
      sub_id: string;
      effective_at: Date;
      occurred_at: Date;
      amount_cents: number;
      amount_cents_min: number;
      currency: string;
      subscription_id: string;
      user_id: string;
      pay_id: string | null;
      note: string | null;
      deliveries: number;
    }>;

    for (const r of directRows) {
      if (Number(r.amount_cents) !== Number(r.amount_cents_min)) {
        console.warn(
          `  ! ${r.sub_id} cycle ${new Date(r.effective_at).toISOString()} has deliveries ` +
            `disagreeing on the amount (${r.amount_cents_min} vs ${r.amount_cents}); taking the larger.`,
        );
      }
    }

    const fromDirect: Row[] = directRows.map((r) => ({
      direction: "C" as const,
      amountCents: Number(r.amount_cents),
      currency: r.currency,
      // The same key `recordCharge` builds — the cycle, not the delivery.
      idempotencyKey: `razorpay:sub:${r.sub_id}:${new Date(r.effective_at).toISOString()}`,
      provider: "razorpay" as const,
      userId: r.user_id,
      subscriptionId: r.subscription_id,
      providerPaymentId: r.pay_id,
      note: r.note,
      createdAt: new Date(r.occurred_at),
      deliveries: Number(r.deliveries),
    }));

    /* ---------------- the plan ---------------- */

    const rows = [...fromPartners, ...fromDirect].sort(
      (a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime(),
    );

    const collapsed = fromDirect.reduce((n, r) => n + ((r.deliveries ?? 1) - 1), 0);

    console.log("  DERIVED");
    console.log(`    partner orders paid              ${fromPartners.length}`);
    console.log(
      `    direct charges                   ${fromDirect.length}` +
        (collapsed ? `  (from ${fromDirect.length + collapsed} log rows — ${collapsed} duplicates collapsed)` : ""),
    );
    console.log(`    total rows                       ${rows.length}\n`);

    console.log("  MONEY");
    show("partner", totals(fromPartners));
    show("direct", totals(fromDirect));
    show("LEDGER TOTAL", totals(rows));

    /*
     * What the reports used to say, by the rule that is being retired: priced
     * billing-log rows, five or six allowed events, comps excluded. Printed so
     * the difference is visible and explained rather than discovered later on a
     * dashboard that quietly moved.
     */
    const oldRule = (await db.execute(sql`
      SELECT l.currency, sum(l.amount_cents)::int AS cents
      FROM subscription_logs l
      WHERE l.amount_cents IS NOT NULL
        AND l.actor <> 'admin'
        AND l.event IN ('plan_granted', 'renewed', 'upgraded', 'downgraded', 'payment_succeeded')
      GROUP BY 1
    `)) as unknown as Array<{ currency: string | null; cents: number }>;

    const before: Record<string, number> = {};
    for (const r of oldRule) before[r.currency ?? "INR"] = Number(r.cents);
    show("previously reported", before);

    const after = totals(rows);
    const deltas = Object.keys({ ...before, ...after }).map((c) =>
      money((after[c] ?? 0) - (before[c] ?? 0), c),
    );
    console.log(`  ${"difference".padEnd(34)} ${deltas.join("  +  ")}`);
    console.log("  (a negative difference is the double-counting leaving, not data loss)\n");

    if (refreshNotes) {
      const pairs = rows
        .filter((r) => r.note)
        .map((r) => sql`(${r.idempotencyKey}::text, ${r.note}::text)`);

      if (!apply) {
        console.log(
          `  Dry run — would fill a note on up to ${pairs.length} rows that have none.\n`,
        );
        return;
      }

      // ONE statement, not one per row: the update joins against a VALUES list,
      // so 22 rows and 22,000 cost the same single round trip.
      const updated = (await db.execute(sql`
        UPDATE transactions t
        SET note = v.note
        FROM (VALUES ${sql.join(pairs, sql`, `)}) AS v(key, note)
        WHERE t.idempotency_key = v.key
          AND t.note IS NULL
        RETURNING t.id
      `)) as unknown as Array<{ id: string }>;

      console.log(`  NOTES FILLED ${updated.length} of ${pairs.length} candidates`);
      console.log("  (any row that already had a note was left alone)\n");
      return;
    }

    if (!apply) {
      console.log("  Dry run — nothing written. Re-run with --apply to insert.\n");
      return;
    }

    /* ---------------- write ---------------- */

    const inserted = await db
      .insert(transactions)
      .values(
        rows.map((row) => {
          const values = { ...row };
          delete values.deliveries; // reporting only — not a column
          return values;
        }),
      )
      .onConflictDoNothing({ target: transactions.idempotencyKey })
      .returning({ id: transactions.id });

    console.log(`  INSERTED ${inserted.length} of ${rows.length}`);
    if (inserted.length !== rows.length) {
      console.log(`  (${rows.length - inserted.length} already present — re-run, or a live webhook beat us)`);
    }

    const check = (await db.execute(sql`
      SELECT currency, sum(amount_cents)::int AS cents, count(*)::int AS n
      FROM transactions GROUP BY 1 ORDER BY 1
    `)) as unknown as Array<{ currency: string; cents: number; n: number }>;

    console.log("\n  LEDGER NOW");
    for (const r of check) {
      console.log(`    ${r.currency}  ${money(Number(r.cents), r.currency).padStart(14)}  (${r.n} rows)`);
    }
    console.log();
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
