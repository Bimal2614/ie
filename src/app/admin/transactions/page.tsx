import Link from "next/link";

import { cardClass } from "@/components/dashboard/ui";
import { ListControls, Pager } from "@/components/ui/list-controls";
import { requireAdmin } from "@/lib/dal";
import { parsePageRequest } from "@/lib/pagination";
import { adminTransactions, TRANSACTION_DEFAULTS } from "@/lib/payments/transactions";
import { formatPrice } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format-date";

const dateTime = (d: unknown) => formatDateTime(d) ?? "—";

const PROVIDER_LABEL: Record<string, string> = {
  razorpay: "Direct",
  partner: "Class",
  manual: "Manual",
};

/**
 * The money ledger, newest first.
 *
 * DELIBERATELY THIN. Every row here means money actually moved, so the screen
 * answers "what came in, from whom, when" and nothing else — an order that was
 * never paid, a declined card and an admin comp all belong on /admin/payments
 * or in the billing log, and showing them here would put things on a revenue
 * screen that are not revenue.
 */
export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const req = parsePageRequest(await searchParams, TRANSACTION_DEFAULTS);
  const page = await adminTransactions(req);

  const totals = Object.entries(page.totals);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-2xl text-ink">Transactions</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every payment we have actually received. One row means money moved — comps, abandoned
          checkouts and declined cards are not here.
        </p>
      </div>

      {/* The totals are for everything the filter matches, not this page. */}
      <section className={cn(cardClass, "flex flex-wrap items-baseline gap-x-8 gap-y-2 p-5")}>
        {totals.length === 0 ? (
          <span className="text-sm text-ink-muted">Nothing received yet.</span>
        ) : (
          totals.map(([currency, cents]) => (
            <span key={currency}>
              <span className="display text-2xl tabular-nums text-ink">
                {formatPrice(cents, currency)}
              </span>
              <span className="ml-2 text-xs text-ink-muted">{currency}</span>
            </span>
          ))
        )}
        <span className="ml-auto text-xs text-ink-muted">
          {page.total} {page.total === 1 ? "transaction" : "transactions"}
        </span>
      </section>

      <section className={cn(cardClass, "overflow-hidden")}>
        <ListControls
          basePath="/admin/transactions"
          req={req}
          filters={[
            { key: "all", label: "All" },
            { key: "razorpay", label: "Direct" },
            { key: "partner", label: "Class" },
            { key: "manual", label: "Manual" },
          ]}
          sorts={[
            { key: "created", label: "Date" },
            { key: "amount", label: "Amount" },
          ]}
          placeholder="Search student, class or payment id"
        />

        {page.rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-muted">No transactions match that.</p>
        ) : (
          <ul className="divide-y divide-line">
            {page.rows.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">
                    {t.userName ?? t.partnerName ?? "Deleted account"}
                  </span>
                  <span className="block truncate text-xs text-ink-muted">
                    {t.partnerName && t.partnerId ? (
                      <>
                        <Link href={`/admin/partners/${t.partnerId}`} className="hover:underline">
                          {t.partnerName}
                        </Link>
                        {" · "}
                      </>
                    ) : null}
                    {t.note ?? t.providerPaymentId ?? t.userEmail ?? "—"}
                  </span>
                </span>

                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    t.provider === "razorpay" && "bg-green-soft text-green-ink",
                    t.provider === "partner" && "bg-warning-soft text-ink",
                    t.provider === "manual" && "bg-danger-soft text-danger",
                  )}
                >
                  {PROVIDER_LABEL[t.provider] ?? t.provider}
                </span>

                <span className="tabular-nums text-ink">
                  {formatPrice(t.amountCents, t.currency)}
                </span>
                <span className="w-40 text-right text-xs text-ink-muted">
                  {dateTime(t.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Pager basePath="/admin/transactions" req={req} page={page} noun="transaction" />
      </section>
    </div>
  );
}
